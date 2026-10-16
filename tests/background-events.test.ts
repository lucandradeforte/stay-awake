import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  ALARM_PREFIX,
  DEFAULT_PREFERENCES,
  LOG_KEY,
  PREFS_KEY,
  SESSION_KEY,
  inactiveSession,
  type Response,
} from '../packages/contracts/src/index';

type MessageListener = (
  message: unknown,
  sender: { id: string },
  reply: (response: Response) => void,
) => boolean;
let message: MessageListener;
let startup: () => void;
let installed: (details: { reason: string }) => void;
let alarm: (alarm: { name: string }) => void;
const data = new Map<string, unknown>();
const alarms = new Map<string, { when: number }>();
const power = { requestKeepAwake: vi.fn(), releaseKeepAwake: vi.fn() };
async function request(command: unknown, sender = 'test-extension'): Promise<Response> {
  return new Promise((resolve) => message(command, { id: sender }, resolve));
}
beforeEach(async () => {
  vi.resetModules();
  vi.clearAllMocks();
  data.clear();
  alarms.clear();
  vi.stubGlobal('chrome', {
    runtime: {
      id: 'test-extension',
      onMessage: {
        addListener: (fn: MessageListener) => {
          message = fn;
        },
      },
      onStartup: {
        addListener: (fn: () => void) => {
          startup = fn;
        },
      },
      onInstalled: {
        addListener: (fn: typeof installed) => {
          installed = fn;
        },
      },
    },
    storage: {
      local: {
        get: async () => Object.fromEntries(data),
        set: async (entries: Record<string, unknown>) => {
          for (const [key, value] of Object.entries(entries)) data.set(key, value);
        },
        clear: async () => {
          data.clear();
        },
      },
    },
    alarms: {
      getAll: async () => [...alarms].map(([name, value]) => ({ name, scheduledTime: value.when })),
      create: async (name: string, value: { when: number }) => {
        alarms.set(name, value);
      },
      clear: async (name: string) => alarms.delete(name),
      onAlarm: {
        addListener: (fn: typeof alarm) => {
          alarm = fn;
        },
      },
    },
    power,
    action: { setBadgeText: vi.fn(), setBadgeBackgroundColor: vi.fn(), setTitle: vi.fn() },
  });
  await import('../apps/extension/src/background/index');
});
describe('real background listener queue with browser adapters', () => {
  it('rejects foreign senders and malformed commands', async () => {
    expect(
      await request({ type: 'SESSION_START', level: 'display', durationMinutes: 1 }, 'foreign'),
    ).toEqual({ ok: false, error: 'Origem não autorizada.' });
    expect((await request({ type: 'PREFERENCES_SET', patch: null })).ok).toBe(false);
    expect(power.requestKeepAwake).not.toHaveBeenCalled();
  });
  it('orders concurrent messages and ignores a stale alarm', async () => {
    const [first, second, stopped] = await Promise.all([
      request({ type: 'SESSION_START', level: 'display', durationMinutes: 1 }),
      request({ type: 'SESSION_START', level: 'system', durationMinutes: 2 }),
      request({ type: 'SESSION_STOP' }),
    ]);
    expect(first.ok && first.data.session.status).toBe('active');
    expect(second.ok && second.data.session.level).toBe('system');
    expect(stopped.ok && stopped.data.session.status).toBe('inactive');
    expect(alarms.size).toBe(0);
    alarm({ name: ALARM_PREFIX + 'obsolete' });
    const result = await request({ type: 'SESSION_GET' });
    expect(result.ok && result.data.session.status).toBe('inactive');
  });
  it.each(['install', 'update'])('onInstalled (%s) reconciles persisted state', async (reason) => {
    const now = Date.now();
    data.set(SESSION_KEY, {
      ...inactiveSession(now),
      id: 'previous',
      status: 'active',
      startedAt: now,
      durationMinutes: 1,
      expiresAt: now + 60000,
    });
    installed({ reason });
    const result = await request({ type: 'SESSION_GET' });
    expect(result.ok && result.data.session.status).toBe(
      reason === 'install' ? 'active' : 'inactive',
    );
  });
  it('onStartup applies restart opt-out before the following message', async () => {
    await request({ type: 'SESSION_START', level: 'display', durationMinutes: 1 });
    startup();
    const result = await request({ type: 'SESSION_GET' });
    expect(result.ok && result.data.session.status).toBe('inactive');
    expect(alarms.size).toBe(0);
  });
  it('onStartup restores a finite request with opt-in and recreates the alarm', async () => {
    data.set(PREFS_KEY, { ...DEFAULT_PREFERENCES, resumeOnBrowserRestart: true });
    await request({ type: 'SESSION_START', level: 'system', durationMinutes: 1 });
    alarms.clear();
    startup();
    const result = await request({ type: 'SESSION_GET' });
    expect(result.ok && result.data.session.status).toBe('active');
    expect(alarms.size).toBe(1);
    expect(data.get(LOG_KEY)).toBeTruthy();
  });
});
