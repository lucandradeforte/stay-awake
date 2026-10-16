import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ALARM_PREFIX, LOG_KEY, PREFS_KEY, SESSION_KEY } from '../packages/contracts/src/index';
import { handleAlarm, loadSnapshot, reconcile, runCommand, serialized } from '../apps/extension/src/background/session-controller';
const data = new Map<string, unknown>();
const alarms = new Map<string, { when:number }>();
const power = { requestKeepAwake: vi.fn(), releaseKeepAwake: vi.fn() };
const action = { setBadgeText: vi.fn(), setBadgeBackgroundColor: vi.fn(), setTitle: vi.fn() };
Object.assign(globalThis, {
  chrome: {
    storage: { local: {
      get: vi.fn(async (keys: string[]) => Object.fromEntries(keys.filter(k=>data.has(k)).map(k=>[k,data.get(k)]))),
      set: vi.fn(async (value:Record<string,unknown>) => { Object.entries(value).forEach(([key,val])=>data.set(key,val)); }),
      clear: vi.fn(async ()=>{data.clear();})
    } },
    alarms: { create: vi.fn(async (name:string,value:{when:number})=>{alarms.set(name,value);}), clear: vi.fn(async (name:string)=>alarms.delete(name)), getAll: vi.fn(async () => [...alarms].map(([name, value]) => ({ name, scheduledTime: value.when }))) },
    action, power
  }
});
beforeEach(() => { data.clear(); alarms.clear(); vi.clearAllMocks(); vi.useRealTimers(); });
describe('background command controller', () => {
  it('starts a timed display session and schedules one alarm', async () => {
    const result = await runCommand({type:'SESSION_START',level:'display',durationMinutes:15});
    expect(result.session.status).toBe('active');
    expect(result.session.expiresAt! - result.session.startedAt!).toBe(900_000);
    expect(power.requestKeepAwake).toHaveBeenCalledWith('display');
    expect(alarms.size).toBe(1);
    expect(data.has(SESSION_KEY)).toBe(true);
    expect(data.has(LOG_KEY)).toBe(true);
  });
  it('stops and cancels its alarm', async () => {
    await runCommand({type:'SESSION_START',level:'system',durationMinutes:30});
    const result = await runCommand({type:'SESSION_STOP'});
    expect(result.session.status).toBe('inactive');
    expect(power.releaseKeepAwake).toHaveBeenCalled();
    expect(alarms.size).toBe(0);
  });
  it('ignores stale alarms from previous sessions', async () => {
    const first = (await runCommand({type:'SESSION_START',level:'display',durationMinutes:15})).session.id;
    await runCommand({type:'SESSION_START',level:'display',durationMinutes:30});
    await handleAlarm(ALARM_PREFIX+first);
    expect((await runCommand({type:'SESSION_GET'})).session.status).toBe('active');
  });
  it('handles alarm expiration once time has passed', async () => {
    const started = (await runCommand({type:'SESSION_START',level:'display',durationMinutes:15})).session;
    vi.useFakeTimers(); vi.setSystemTime(started.expiresAt!+1000);
    await handleAlarm(ALARM_PREFIX+started.id);
    expect((await runCommand({type:'SESSION_GET'})).session.status).toBe('expired');
    expect(alarms.size).toBe(0);
  });
  it('supports indefinite duration and reset', async () => {
    const session = (await runCommand({type:'SESSION_START',level:'display',durationMinutes:null})).session;
    expect(session.expiresAt).toBeNull();
    expect(alarms.size).toBe(0);
    await runCommand({type:'PREFERENCES_SET',patch:{developerModeEnabled:true}});
    expect(data.has(PREFS_KEY)).toBe(true);
    await runCommand({type:'RESET_LOCAL_DATA'});
    expect(data.size).toBe(0);
  });
});

describe('fault injection and recovery', () => {
  it.each(['PREFERENCES_SET', 'DIAGNOSTIC_CLEAR'] as const)('preserves an active request if %s storage fails', async type => {
    const active = await runCommand({ type: 'SESSION_START', level: 'display', durationMinutes: 1 });
    power.releaseKeepAwake.mockClear();
    vi.mocked(chrome.storage.local.set).mockRejectedValueOnce(new Error('quota'));
    const result = await runCommand(type === 'PREFERENCES_SET' ? { type, patch: { workspaceTheme: 'light' } } : { type });
    expect(result.session).toEqual(active.session);
    expect(result.warnings).toHaveLength(1); expect(power.releaseKeepAwake).not.toHaveBeenCalled();
    expect(alarms.size).toBe(1);
  });
  it('reports a failed power release even if the compensation release also fails', async () => {
    await runCommand({ type: 'SESSION_START', level: 'display', durationMinutes: 1 });
    power.releaseKeepAwake.mockImplementationOnce(() => { throw new Error('original release'); }).mockImplementationOnce(() => { throw new Error('secondary release'); });
    const result = await runCommand({ type: 'SESSION_STOP' });
    expect(result.session.status).toBe('error'); expect(result.session.lastError?.code).toBe('SESSION_ERROR');
    expect(result.warnings?.some(warning => warning.includes('Desative a extensão'))).toBe(true);
    expect(alarms.size).toBe(0);
  });
  it('rejects corrupt stored sessions and sanitizes preferences and logs', async () => {
    data.set(SESSION_KEY, { schemaVersion: 1, status: 'active', level: 'wrong' });
    data.set(PREFS_KEY, null); data.set(LOG_KEY, [null, {}, { id: 'x', at: -1, event: [], detail: '' }]);
    const result = await reconcile('worker');
    expect(result.session.status).toBe('inactive'); expect(result.events).toEqual([]);
    expect(power.requestKeepAwake).not.toHaveBeenCalled(); expect(power.releaseKeepAwake).toHaveBeenCalled();
  });
  it('recreates a lost alarm on worker wake and expires a historical session', async () => {
    const initial = await runCommand({ type: 'SESSION_START', level: 'system', durationMinutes: 1 });
    alarms.clear(); await reconcile('worker'); expect(alarms.size).toBe(1);
    vi.useFakeTimers(); vi.setSystemTime(initial.session.expiresAt! + 1);
    expect((await reconcile('worker')).session.status).toBe('expired'); expect(alarms.size).toBe(0);
  });
  it('does not restore on browser startup by default; requires two opt-ins for unlimited', async () => {
    await runCommand({ type: 'SESSION_START', level: 'display', durationMinutes: null });
    expect((await reconcile('browser-startup')).session.status).toBe('inactive');
    await runCommand({ type: 'PREFERENCES_SET', patch: { resumeOnBrowserRestart: true } });
    await runCommand({ type: 'SESSION_START', level: 'display', durationMinutes: null });
    expect((await reconcile('extension-reload')).session.status).toBe('inactive');
    await runCommand({ type: 'PREFERENCES_SET', patch: { resumeUnlimitedOnRestart: true } });
    await runCommand({ type: 'SESSION_START', level: 'display', durationMinutes: null });
    expect((await reconcile('browser-startup')).session.status).toBe('active');
  });
  it('releases power even if storage cannot be read on STOP', async () => {
    vi.mocked(chrome.storage.local.get).mockRejectedValueOnce(new Error('storage unavailable'));
    const result = await runCommand({ type: 'SESSION_STOP' });
    expect(power.releaseKeepAwake).toHaveBeenCalled(); expect(result.session.status).toBe('error');
  });
  it('compensates a failed active-state write after power was requested', async () => {
    vi.mocked(chrome.storage.local.set).mockImplementationOnce(async () => {}).mockRejectedValueOnce(new Error('quota'));
    const result = await runCommand({ type: 'SESSION_START', level: 'display', durationMinutes: 1 });
    expect(result.session.status).toBe('error'); expect(alarms.size).toBe(0);
    expect(power.releaseKeepAwake.mock.calls.length).toBeGreaterThanOrEqual(2);
  });
  it('does not request power when starting-state persistence fails', async () => {
    vi.mocked(chrome.storage.local.set).mockRejectedValueOnce(new Error('quota'));
    expect((await runCommand({ type: 'SESSION_START', level: 'display', durationMinutes: 1 })).session.status).toBe('error');
    expect(power.requestKeepAwake).not.toHaveBeenCalled();
  });
  it('returns the original power failure even when error-state persistence and badge fail', async () => {
    power.requestKeepAwake.mockImplementationOnce(() => { throw new Error('power denied'); });
    vi.mocked(chrome.storage.local.set).mockImplementationOnce(async () => {}).mockRejectedValueOnce(new Error('secondary write'));
    action.setBadgeText.mockRejectedValueOnce(new Error('badge'));
    const result = await runCommand({ type: 'SESSION_START', level: 'display', durationMinutes: 1 });
    expect(result.session.status).toBe('error'); expect(result.session.lastError?.code).toBe('SESSION_ERROR');
    expect(result.warnings?.length).toBeGreaterThan(0);
  });
  it('rolls back failed alarm creation', async () => {
    vi.mocked(chrome.alarms.create).mockRejectedValueOnce(new Error('alarm failure'));
    expect((await runCommand({ type: 'SESSION_START', level: 'display', durationMinutes: 1 })).session.status).toBe('error');
    expect(alarms.size).toBe(0);
  });
  it('releases power before attempting to clear a broken alarm', async () => {
    await runCommand({ type: 'SESSION_START', level: 'display', durationMinutes: 1 });
    power.releaseKeepAwake.mockClear(); vi.mocked(chrome.alarms.clear).mockRejectedValueOnce(new Error('clear failure'));
    const result = await runCommand({ type: 'SESSION_STOP' });
    expect(power.releaseKeepAwake).toHaveBeenCalled(); expect(result.session.status).toBe('error');
  });
  it('keeps an active request when badge or event log fails', async () => {
    action.setBadgeText.mockRejectedValueOnce(new Error('badge failure'));
    const result = await runCommand({ type: 'SESSION_START', level: 'display', durationMinutes: 1 });
    expect(result.session.status).toBe('active'); expect(result.warnings?.length).toBeGreaterThan(0);
    vi.mocked(chrome.storage.local.set).mockImplementationOnce(async () => {}).mockImplementationOnce(async () => {}).mockRejectedValueOnce(new Error('log failure'));
    const logged = await runCommand({ type: 'SESSION_START', level: 'display', durationMinutes: 1 });
    expect(logged.session.status).toBe('active'); expect(logged.warnings?.length).toBeGreaterThan(0);
  });
  it('cleans an interrupted stopping transition without reactivating power', async () => {
    const started = await runCommand({ type: 'SESSION_START', level: 'display', durationMinutes: 1 });
    data.set(SESSION_KEY, { ...started.session, status: 'stopping' }); power.requestKeepAwake.mockClear();
    expect((await reconcile('worker')).session.status).toBe('inactive');
    expect(power.requestKeepAwake).not.toHaveBeenCalled(); expect(alarms.size).toBe(0);
  });
  it('serializes concurrent START/START/STOP and continues after a rejected command', async () => {
    const results = await Promise.all([
      serialized(() => runCommand({ type: 'SESSION_START', level: 'display', durationMinutes: 1 })),
      serialized(() => runCommand({ type: 'SESSION_START', level: 'system', durationMinutes: 2 })),
      serialized(() => runCommand({ type: 'SESSION_STOP' }))
    ]);
    expect(results.map(r => r.session.status)).toEqual(['active', 'active', 'inactive']);
    expect((await loadSnapshot()).session.status).toBe('inactive'); expect(alarms.size).toBe(0);
    await expect(serialized(() => runCommand(null))).rejects.toThrow('Comando inválido');
    expect((await serialized(() => runCommand({ type: 'SESSION_STOP' }))).session.status).toBe('inactive');
  });
});
