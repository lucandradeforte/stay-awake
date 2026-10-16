import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ALARM_PREFIX, LOG_KEY, PREFS_KEY, SESSION_KEY } from '../packages/contracts/src/index';
import { handleAlarm, runCommand } from '../apps/extension/src/background/session-controller';
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
    alarms: { create: vi.fn(async (name:string,value:{when:number})=>{alarms.set(name,value);}), clear: vi.fn(async (name:string)=>alarms.delete(name)) },
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
