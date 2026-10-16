import {
  ALARM_PREFIX, DEFAULT_PREFERENCES, LOG_KEY, PREFS_KEY, SCHEMA_VERSION, SESSION_KEY,
  inactiveSession, isCommand, isEventLog, isExpired, isSession, parsePreferencePatch, shouldResumeOnStartup,
  type EventLog, type Session, type Snapshot
} from '@stay-awake/contracts';

/** One queue for messages and browser events within each MV3 worker instance. */
let pending: Promise<unknown> = Promise.resolve();
let workerHasReconciled = false;
export function serialized<T>(work: () => Promise<T>): Promise<T> {
  const result = pending.then(work, work);
  pending = result.catch(() => undefined);
  return result;
}
const emptySnapshot = (): Snapshot => ({ session: inactiveSession(Date.now()), preferences: { ...DEFAULT_PREFERENCES }, events: [] });
export async function loadSnapshot(): Promise<Snapshot> {
  const data = await chrome.storage.local.get([SESSION_KEY, PREFS_KEY, LOG_KEY]);
  const session: unknown = data[SESSION_KEY];
  const events: unknown = data[LOG_KEY];
  return {
    session: isSession(session) ? session : inactiveSession(Date.now()),
    preferences: { ...DEFAULT_PREFERENCES, ...parsePreferencePatch(data[PREFS_KEY]) },
    events: Array.isArray(events) ? events.filter(isEventLog).slice(-80) : []
  };
}
const saveSession = (session: Session) => chrome.storage.local.set({ [SESSION_KEY]: session });
async function clearOwnedAlarms(): Promise<void> {
  const alarms = await chrome.alarms.getAll();
  await Promise.all(alarms.filter(alarm => alarm.name.startsWith(ALARM_PREFIX)).map(alarm => chrome.alarms.clear(alarm.name)));
}
async function updateBadge(session: Session): Promise<void> {
  const active = session.status === 'active';
  const error = session.status === 'error';
  await chrome.action.setBadgeText({ text: active ? (session.expiresAt === null ? '∞' : 'ON') : error ? '!' : '' });
  if (active || error) await chrome.action.setBadgeBackgroundColor({ color: error ? '#C76767' : '#327955' });
  await chrome.action.setTitle({ title: active ? 'Stay Awake · Solicitação ativa' : error ? 'Stay Awake · Erro' : 'Stay Awake · Inativo' });
}
/** Badge and event history are auxiliary: failure here must not undo a valid request. */
async function present(snapshot: Snapshot, event?: string, detail = ''): Promise<Snapshot> {
  const warnings = [...(snapshot.warnings ?? [])];
  try { await updateBadge(snapshot.session); }
  catch { warnings.push('Não foi possível atualizar o indicador da barra. Consulte o estado nesta página.'); }
  if (event) {
    const entry: EventLog = { id: crypto.randomUUID(), event, detail, at: Date.now() };
    const events = [...snapshot.events, entry].slice(-80);
    try { await chrome.storage.local.set({ [LOG_KEY]: events }); snapshot = { ...snapshot, events }; }
    catch { warnings.push('Não foi possível salvar o evento de diagnóstico local.'); }
  }
  return warnings.length ? { ...snapshot, warnings } : snapshot;
}
/** Always return a coherent error even if compensation, storage or badge also fails. */
async function errorState(error: unknown, snapshot: Snapshot = emptySnapshot()): Promise<Snapshot> {
  const warnings: string[] = [];
  try { chrome.power.releaseKeepAwake(); }
  catch { warnings.push('A liberação de energia falhou. Desative a extensão para liberar a solicitação.'); }
  try { await clearOwnedAlarms(); } catch { warnings.push('Não foi possível limpar os alarmes locais.'); }
  const code = error instanceof Error && error.name === 'StorageReadError' ? 'STORAGE_ERROR' : 'SESSION_ERROR';
  const message = code === 'STORAGE_ERROR'
    ? 'Não foi possível ler o estado local. A solicitação de energia foi encaminhada para liberação.'
    : 'A operação da sessão falhou. A solicitação de energia foi encaminhada para liberação; tente novamente.';
  const session: Session = { ...snapshot.session, status: 'error', updatedAt: Date.now(), lastError: { code, message, at: Date.now() } };
  try { await saveSession(session); }
  catch { warnings.push('Não foi possível salvar o estado de erro. O estado persistido pode estar desatualizado.'); }
  return present({ ...snapshot, session, warnings }, 'session.error', code);
}
async function read(): Promise<Snapshot> {
  try { return await loadSnapshot(); }
  catch { const error = new Error('Storage read failed'); error.name = 'StorageReadError'; throw error; }
}
async function stopCurrent(reason: 'manual' | 'expired' | 'restart' | 'reset', snapshot: Snapshot): Promise<Snapshot> {
  // Release before storage/alarm I/O: even a broken store must not prevent STOP.
  chrome.power.releaseKeepAwake();
  await clearOwnedAlarms();
  const previous = snapshot.session;
  const session: Session = {
    ...inactiveSession(Date.now()), status: reason === 'expired' ? 'expired' : 'inactive',
    level: previous.level, id: previous.id, startedAt: previous.startedAt,
    expiresAt: previous.expiresAt, durationMinutes: previous.durationMinutes
  };
  await saveSession(session);
  return present({ ...snapshot, session }, 'session.stop', reason);
}
async function start(level: 'display' | 'system', durationMinutes: number | null, snapshot: Snapshot): Promise<Snapshot> {
  chrome.power.releaseKeepAwake();
  await clearOwnedAlarms();
  const now = Date.now();
  const session: Session = {
    schemaVersion: SCHEMA_VERSION, id: crypto.randomUUID(), status: 'starting', level, durationMinutes,
    startedAt: now, expiresAt: durationMinutes === null ? null : now + durationMinutes * 60_000, updatedAt: now
  };
  // Retain the attempted transition for compensation if the committed write fails.
  snapshot.session = session;
  await saveSession(session);
  chrome.power.requestKeepAwake(level);
  if (session.expiresAt !== null) await chrome.alarms.create(ALARM_PREFIX + session.id, { when: session.expiresAt });
  const active: Session = { ...session, status: 'active', updatedAt: Date.now() };
  await saveSession(active);
  return present({ ...snapshot, session: active }, 'session.start', `${level}; duration=${durationMinutes ?? 'unlimited'}`);
}

/** Reconcile desired state. No Windows lock state is observed. */
export async function reconcile(origin: 'worker' | 'browser-startup' | 'extension-reload'): Promise<Snapshot> {
  let snapshot = emptySnapshot();
  try {
    snapshot = await read();
    const { session, preferences } = snapshot;
    if (isExpired(session, Date.now()) && ['active', 'starting', 'reconciling'].includes(session.status)) {
      const result = await stopCurrent('expired', snapshot); workerHasReconciled = true; return result;
    }
    if (origin !== 'worker' && !shouldResumeOnStartup(session, preferences, Date.now())) {
      const result = await stopCurrent('restart', snapshot); workerHasReconciled = true; return result;
    }
    if (session.status === 'starting') throw new Error('Interrupted start');
    if (session.status === 'active' || session.status === 'reconciling') {
      await saveSession({ ...session, status: 'reconciling', updatedAt: Date.now() });
      chrome.power.requestKeepAwake(session.level);
      if (session.expiresAt !== null) await chrome.alarms.create(ALARM_PREFIX + session.id, { when: session.expiresAt });
      const active: Session = { ...session, status: 'active', updatedAt: Date.now() };
      await saveSession(active);
      workerHasReconciled = true;
      return present({ ...snapshot, session: active });
    }
    chrome.power.releaseKeepAwake();
    await clearOwnedAlarms();
    if (session.status === 'stopping') snapshot = await stopCurrent('restart', snapshot);
    workerHasReconciled = true;
    return present(snapshot);
  } catch (error) { workerHasReconciled = false; return errorState(error, snapshot); }
}
export async function runCommand(input: unknown): Promise<Snapshot> {
  if (!isCommand(input)) throw new Error('Comando inválido.');
  if (input.type === 'SESSION_GET' && !workerHasReconciled) return reconcile('worker');
  let snapshot = emptySnapshot();
  try {
    snapshot = await read();
    switch (input.type) {
      case 'SESSION_GET': {
        if (snapshot.session.status === 'active' && isExpired(snapshot.session, Date.now())) return await stopCurrent('expired', snapshot);
        if (snapshot.session.status === 'stopping') return await stopCurrent('restart', snapshot);
        if (!['active', 'starting', 'reconciling'].includes(snapshot.session.status)) {
          chrome.power.releaseKeepAwake(); await clearOwnedAlarms();
        }
        return snapshot;
      }
      case 'SESSION_START': return await start(input.level, input.durationMinutes, snapshot);
      case 'SESSION_STOP': return await stopCurrent('manual', snapshot);
      case 'SESSION_UPDATE_DURATION': {
        if (snapshot.session.status !== 'active') throw new Error('Inactive session');
        return await start(snapshot.session.level, input.durationMinutes, snapshot);
      }
      case 'PREFERENCES_SET': {
        const preferences = { ...snapshot.preferences, ...parsePreferencePatch(input.patch) };
        await chrome.storage.local.set({ [PREFS_KEY]: preferences });
        return { ...snapshot, preferences };
      }
      case 'DIAGNOSTIC_CLEAR': {
        await chrome.storage.local.set({ [LOG_KEY]: [] }); return { ...snapshot, events: [] };
      }
      case 'RESET_LOCAL_DATA': {
        await stopCurrent('reset', snapshot);
        await chrome.storage.local.clear(); return emptySnapshot();
      }
    }
  } catch (error) { return errorState(error, snapshot); }
}
export async function handleAlarm(name: string): Promise<void> {
  if (!name.startsWith(ALARM_PREFIX)) return;
  // A stale alarm can be the first event waking a worker: restore the current alarm too.
  if (!workerHasReconciled) { await reconcile('worker'); return; }
  let snapshot = emptySnapshot();
  try {
    snapshot = await read();
    const { session } = snapshot;
    if (name !== ALARM_PREFIX + session.id || session.status !== 'active') return;
    if (isExpired(session, Date.now())) await stopCurrent('expired', snapshot);
    else if (session.expiresAt !== null) await chrome.alarms.create(name, { when: session.expiresAt });
  } catch (error) { await errorState(error, snapshot); }
}
