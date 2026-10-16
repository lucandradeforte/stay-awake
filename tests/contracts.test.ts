import { describe, expect, it } from 'vitest';
import {
  DEFAULT_PREFERENCES, formatDuration, inactiveSession, isCommand,
  isExpired, parsePreferencePatch, remainingMs, shouldResumeOnStartup, validDuration
} from '../packages/contracts/src/index';
describe('duration and message validation', () => {
  it('accepts finite minutes within 1..1440 and unlimited', () => {
    expect(validDuration(null)).toBe(true);
    expect(validDuration(1)).toBe(true);
    expect(validDuration(1440)).toBe(true);
    for (const invalid of [-1, 0, 1441, 1.5, Infinity, '60', undefined]) expect(validDuration(invalid)).toBe(false);
  });
  it('rejects unknown commands and invalid power levels', () => {
    expect(isCommand({ type: 'SESSION_START', level:'display', durationMinutes:60 })).toBe(true);
    expect(isCommand({ type: 'SESSION_START', level:'monitor', durationMinutes:60 })).toBe(false);
    expect(isCommand({ type: 'SESSION_START', level:'display', durationMinutes:0 })).toBe(false);
    expect(isCommand({ type: 'CLOSE_WINDOWS' })).toBe(false);
  });
  it('sanitizes preferences patches', () => {
    expect(parsePreferencePatch({ workspaceTheme:'dark', resumeOnBrowserRestart:true })).toEqual({ workspaceTheme:'dark', resumeOnBrowserRestart:true });
    expect(parsePreferencePatch({ developerModeEnabled:'yes' as unknown as boolean })).toEqual({});
  });
});
describe('session time', () => {
  it('formats countdown and unlimited', () => {
    expect(formatDuration(3_661_000)).toBe('01:01:01');
    expect(formatDuration(0)).toBe('00:00:00');
    expect(formatDuration(null)).toBe('Sem limite');
  });
  it('respects absolute expiry and never shows a negative time', () => {
    const session = { ...inactiveSession(100), status:'active' as const, expiresAt:1000 };
    expect(isExpired(session, 1000)).toBe(true);
    expect(remainingMs(session, 2000)).toBe(0);
  });
  it('never resumes by default; finite and unlimited require separate permission', () => {
    const current = { ...inactiveSession(100), status:'active' as const, expiresAt:1000 };
    expect(shouldResumeOnStartup(current, DEFAULT_PREFERENCES, 500)).toBe(false);
    expect(shouldResumeOnStartup(current, { ...DEFAULT_PREFERENCES, resumeOnBrowserRestart:true }, 500)).toBe(true);
    expect(shouldResumeOnStartup(current, { ...DEFAULT_PREFERENCES, resumeOnBrowserRestart:true }, 1001)).toBe(false);
    expect(shouldResumeOnStartup({ ...current, expiresAt:null }, { ...DEFAULT_PREFERENCES, resumeOnBrowserRestart:true }, 500)).toBe(false);
    expect(shouldResumeOnStartup({ ...current, expiresAt:null }, { ...DEFAULT_PREFERENCES, resumeOnBrowserRestart:true, resumeUnlimitedOnRestart:true }, 500)).toBe(true);
  });
});
