import {
  ALARM_PREFIX, DEFAULT_PREFERENCES, LOG_KEY, PREFS_KEY, SCHEMA_VERSION, SESSION_KEY,
  inactiveSession, isCommand, isExpired, parsePreferencePatch, shouldResumeOnStartup,
  type Command, type EventLog, type Preferences, type Session, type Snapshot
} from '@stay-awake/contracts';

/** Global serialization avoids overlapping START/STOP/ALARM events in one MV3 worker instance. */
let pending: Promise<unknown> = Promise.resolve();
let workerHasReconciled = false;
export function serialized<T>(work: () => Promise<T>): Promise<T> {
  const result = pending.then(work, work);
  pending = result.catch(() => undefined);
  return result;
}

export async function loadSnapshot(): Promise<Snapshot> {
  const data = await chrome.storage.local.get([SESSION_KEY, PREFS_KEY, LOG_KEY]);
  const s = data[SESSION_KEY] as Session | undefined;
  const p = data[PREFS_KEY] as Partial<Preferences> | undefined;
  const e = data[LOG_KEY] as EventLog[] | undefined;
  return {
    session: s?.schemaVersion === SCHEMA_VERSION && typeof s.status === 'string' ? s : inactiveSession(Date.now()),
    preferences: { ...DEFAULT_PREFERENCES, ...parsePreferencePatch(p ?? {}) },
    events: Array.isArray(e) ? e.slice(-80) : []
  };
}
const saveSession = async (session: Session) => chrome.storage.local.set({ [SESSION_KEY]: session });

async function logEvent(event: string, detail: string): Promise<void> {
  const { events } = await loadSnapshot();
  const entry: EventLog = { id: crypto.randomUUID(), event, detail, at: Date.now() };
  await chrome.storage.local.set({ [LOG_KEY]: [...events, entry].slice(-80) });
}

async function updateBadge(session: Session): Promise<void> {
  const active = session.status === 'active';
  const error = session.status === 'error';
  await chrome.action.setBadgeText({ text: active ? 'ON' : error ? '!' : '' });
  if (active || error) await chrome.action.setBadgeBackgroundColor({ color: error ? '#C76767' : '#327955' });
  await chrome.action.setTitle({ title: active ? 'Stay Awake · Solicitação ativa' : error ? 'Stay Awake · Erro' : 'Stay Awake · Inativo' });
}
async function clearExpiryAlarm(session: Session): Promise<void> {
  if (session.id) await chrome.alarms.clear(ALARM_PREFIX + session.id);
}
async function release(): Promise<void> {
  chrome.power.releaseKeepAwake();
}
async function stopCurrent(reason: 'manual' | 'expired' | 'restart' | 'reset'): Promise<Snapshot> {
  const previous = (await loadSnapshot()).session;
  if (previous.status !== 'inactive' && previous.status !== 'expired') {
    await saveSession({ ...previous, status: 'stopping', updatedAt: Date.now() });
  }
  // Even without persisted state, free any stale request held by this extension.
  await release();
  await clearExpiryAlarm(previous);
  const next: Session = {
    ...inactiveSession(Date.now()),
    status: reason === 'expired' ? 'expired' : 'inactive',
    level: previous.level, id: previous.id, startedAt: previous.startedAt,
    expiresAt: previous.expiresAt, durationMinutes: previous.durationMinutes
  };
  await saveSession(next);
  await updateBadge(next);
  await logEvent('session.stop', reason);
  return loadSnapshot();
}

async function errorState(error: unknown, previous?: Session): Promise<Snapshot> {
  const message = error instanceof Error ? error.message : 'Falha inesperada de gerenciamento de energia.';
  const existing = previous ?? (await loadSnapshot()).session;
  try { await release(); await clearExpiryAlarm(existing); } catch { /* preserve original failure */ }
  const next: Session = {
    ...existing, status: 'error', updatedAt: Date.now(),
    lastError: { code: 'POWER_ERROR', message, at: Date.now() }
  };
  await saveSession(next);
  await updateBadge(next);
  await logEvent('session.error', message.slice(0, 160));
  return loadSnapshot();
}

async function start(level: 'display' | 'system', durationMinutes: number | null): Promise<Snapshot> {
  const previous = (await loadSnapshot()).session;
  await clearExpiryAlarm(previous);
  // Never leave a prior request active if a new START fails before commit.
  await release();
  const now = Date.now();
  const next: Session = {
    schemaVersion: SCHEMA_VERSION, id: crypto.randomUUID(), status: 'starting',
    level, durationMinutes, startedAt: now,
    expiresAt: durationMinutes === null ? null : now + durationMinutes * 60_000,
    updatedAt: now
  };
  await saveSession(next);
  try {
    chrome.power.requestKeepAwake(level);
    if (next.expiresAt !== null) await chrome.alarms.create(ALARM_PREFIX + next.id, { when: next.expiresAt });
    next.status = 'active';
    next.updatedAt = Date.now();
    await saveSession(next);
    await updateBadge(next);
    await logEvent('session.start', `${level}; duration=${durationMinutes ?? 'unlimited'}`);
    return loadSnapshot();
  } catch (error) { return errorState(error, next); }
}

/** Worker can sleep. This reconciles desired state, it does not read actual Windows lock status. */
export async function reconcile(origin: 'worker' | 'browser-startup' | 'extension-reload'): Promise<Snapshot> {
  workerHasReconciled = true;
  const { session, preferences } = await loadSnapshot();
  if (origin === 'browser-startup' || origin === 'extension-reload') {
    if (!shouldResumeOnStartup(session, preferences, Date.now())) return stopCurrent('restart');
  }
  if (session.status === 'active' || session.status === 'reconciling' || session.status === 'starting') {
    if (isExpired(session, Date.now())) return stopCurrent('expired');
    if (session.status === 'starting') return errorState(new Error('Sessão não confirmada após interrupção.'), session);
    try {
      const resumed = { ...session, status: 'reconciling' as const, updatedAt: Date.now() };
      await saveSession(resumed);
      chrome.power.requestKeepAwake(session.level);
      if (session.expiresAt !== null) await chrome.alarms.create(ALARM_PREFIX + session.id, { when: session.expiresAt });
      const active: Session = { ...resumed, status: 'active', updatedAt: Date.now() };
      await saveSession(active);
      await updateBadge(active);
      return loadSnapshot();
    } catch (error) { return errorState(error, session); }
  }
  await updateBadge(session);
  return loadSnapshot();
}

export async function runCommand(input: unknown): Promise<Snapshot> {
  if (!isCommand(input)) throw new Error('Comando inválido.');
  const command: Command = input;
  switch (command.type) {
    case 'SESSION_GET': {
      if (!workerHasReconciled) return reconcile('worker');
      const snapshot = await loadSnapshot();
      return (snapshot.session.status === 'active' && isExpired(snapshot.session, Date.now()))
        ? stopCurrent('expired') : snapshot;
    }
    case 'SESSION_START': return start(command.level, command.durationMinutes);
    case 'SESSION_STOP': return stopCurrent('manual');
    case 'SESSION_UPDATE_DURATION': {
      const s = (await loadSnapshot()).session;
      if (s.status !== 'active') throw new Error('Não existe uma sessão ativa para alterar.');
      return start(s.level, command.durationMinutes);
    }
    case 'PREFERENCES_SET': {
      const { preferences } = await loadSnapshot();
      const updated = { ...preferences, ...parsePreferencePatch(command.patch) };
      await chrome.storage.local.set({ [PREFS_KEY]: updated });
      return loadSnapshot();
    }
    case 'DIAGNOSTIC_CLEAR': {
      await chrome.storage.local.set({ [LOG_KEY]: [] });
      return loadSnapshot();
    }
    case 'RESET_LOCAL_DATA': {
      await stopCurrent('reset');
      await chrome.storage.local.clear();
      return loadSnapshot();
    }
  }
}

export async function handleAlarm(name: string): Promise<void> {
  if (!name.startsWith(ALARM_PREFIX)) return;
  const { session } = await loadSnapshot();
  if (name !== ALARM_PREFIX + session.id || session.status !== 'active') return;
  if (isExpired(session, Date.now())) await stopCurrent('expired');
  else if (session.expiresAt !== null) await chrome.alarms.create(name, { when: session.expiresAt });
}
