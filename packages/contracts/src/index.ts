export const VERSION = '1.0.0';
export const SCHEMA_VERSION = 1;
export const SESSION_KEY = 'stayAwakeSession';
export const PREFS_KEY = 'stayAwakePreferences';
export const LOG_KEY = 'stayAwakeEvents';
export const ALARM_PREFIX = 'stay-awake:expire:';
export const DURATIONS = [15, 30, 60, 120, 240, 480] as const;
export type PowerLevel = 'display' | 'system';
export type Status =
  'inactive' | 'starting' | 'active' | 'stopping' | 'expired' | 'reconciling' | 'error';
export interface Session {
  schemaVersion: 1;
  id: string;
  status: Status;
  level: PowerLevel;
  durationMinutes: number | null;
  startedAt: number | null;
  expiresAt: number | null;
  updatedAt: number;
  lastError?: { code: string; message: string; at: number };
}
export interface Preferences {
  defaultDurationMinutes: number;
  defaultLevel: PowerLevel;
  workspaceTheme: 'dark' | 'light';
  developerModeEnabled: boolean;
  resumeOnBrowserRestart: boolean;
  resumeUnlimitedOnRestart: boolean;
}
export interface EventLog {
  id: string;
  at: number;
  event: string;
  detail: string;
}
export const DEFAULT_PREFERENCES: Preferences = {
  defaultDurationMinutes: 60,
  defaultLevel: 'display',
  workspaceTheme: 'dark',
  developerModeEnabled: false,
  resumeOnBrowserRestart: false,
  resumeUnlimitedOnRestart: false,
};
export const inactiveSession = (now: number): Session => ({
  schemaVersion: SCHEMA_VERSION,
  id: '',
  status: 'inactive',
  level: 'display',
  durationMinutes: null,
  startedAt: null,
  expiresAt: null,
  updatedAt: now,
});
export type Command =
  | { type: 'SESSION_GET' }
  | { type: 'SESSION_START'; level: PowerLevel; durationMinutes: number | null }
  | { type: 'SESSION_STOP' }
  | { type: 'SESSION_UPDATE_DURATION'; durationMinutes: number | null }
  | { type: 'PREFERENCES_SET'; patch: Partial<Preferences> }
  | { type: 'DIAGNOSTIC_CLEAR' }
  | { type: 'RESET_LOCAL_DATA' };
export interface Snapshot {
  session: Session;
  preferences: Preferences;
  events: EventLog[];
  warnings?: string[];
}
export type Response = { ok: true; data: Snapshot } | { ok: false; error: string };

export function validDuration(value: unknown): value is number | null {
  return (
    value === null ||
    (typeof value === 'number' && Number.isInteger(value) && value >= 1 && value <= 1440)
  );
}
export function validLevel(value: unknown): value is PowerLevel {
  return value === 'display' || value === 'system';
}
export function isCommand(value: unknown): value is Command {
  if (!value || typeof value !== 'object' || !('type' in value)) return false;
  const candidate = value as Record<string, unknown>;
  switch (candidate.type) {
    case 'SESSION_GET':
    case 'SESSION_STOP':
    case 'DIAGNOSTIC_CLEAR':
    case 'RESET_LOCAL_DATA':
      return true;
    case 'SESSION_START':
      return validLevel(candidate.level) && validDuration(candidate.durationMinutes);
    case 'SESSION_UPDATE_DURATION':
      return validDuration(candidate.durationMinutes);
    case 'PREFERENCES_SET':
      return (
        !!candidate.patch && typeof candidate.patch === 'object' && !Array.isArray(candidate.patch)
      );
    default:
      return false;
  }
}
function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}
export function parsePreferencePatch(input: unknown): Partial<Preferences> {
  const result: Partial<Preferences> = {};
  if (!isRecord(input)) return result;
  if (validDuration(input.defaultDurationMinutes) && input.defaultDurationMinutes !== null)
    result.defaultDurationMinutes = input.defaultDurationMinutes;
  if (validLevel(input.defaultLevel)) result.defaultLevel = input.defaultLevel;
  if (input.workspaceTheme === 'dark' || input.workspaceTheme === 'light')
    result.workspaceTheme = input.workspaceTheme;
  for (const key of [
    'developerModeEnabled',
    'resumeOnBrowserRestart',
    'resumeUnlimitedOnRestart',
  ] as const) {
    if (typeof input[key] === 'boolean') result[key] = input[key];
  }
  return result;
}

const validTime = (value: unknown): value is number =>
  typeof value === 'number' && Number.isSafeInteger(value) && value >= 0 && value <= 8.64e15;
export function isSession(value: unknown): value is Session {
  if (
    !isRecord(value) ||
    value.schemaVersion !== SCHEMA_VERSION ||
    typeof value.id !== 'string' ||
    !validLevel(value.level) ||
    !validDuration(value.durationMinutes) ||
    !validTime(value.updatedAt)
  )
    return false;
  if (
    !['inactive', 'starting', 'active', 'stopping', 'expired', 'reconciling', 'error'].includes(
      String(value.status),
    )
  )
    return false;
  if (value.startedAt !== null && !validTime(value.startedAt)) return false;
  if (value.expiresAt !== null && !validTime(value.expiresAt)) return false;
  if (
    value.lastError !== undefined &&
    (!isRecord(value.lastError) ||
      typeof value.lastError.code !== 'string' ||
      typeof value.lastError.message !== 'string' ||
      !validTime(value.lastError.at))
  )
    return false;
  if (value.startedAt !== null) {
    if (!value.id || value.updatedAt < value.startedAt) return false;
    if (
      value.durationMinutes === null
        ? value.expiresAt !== null
        : value.expiresAt !== value.startedAt + value.durationMinutes * 60_000
    )
      return false;
  } else if (value.expiresAt !== null || value.durationMinutes !== null) return false;
  if (
    ['active', 'starting', 'reconciling'].includes(String(value.status)) &&
    (value.startedAt === null || !value.id)
  )
    return false;
  return true;
}
export function isEventLog(value: unknown): value is EventLog {
  return (
    isRecord(value) &&
    typeof value.id === 'string' &&
    validTime(value.at) &&
    typeof value.event === 'string' &&
    typeof value.detail === 'string'
  );
}
export function isExpired(session: Session, now: number): boolean {
  return session.expiresAt !== null && session.expiresAt <= now;
}
export function remainingMs(session: Session, now: number): number | null {
  return session.expiresAt === null ? null : Math.max(0, session.expiresAt - now);
}
export function formatDuration(ms: number | null): string {
  if (ms === null) return 'Sem limite';
  const sec = Math.ceil(ms / 1000);
  const hours = Math.floor(sec / 3600);
  const minutes = Math.floor((sec % 3600) / 60);
  const seconds = sec % 60;
  return [hours, minutes, seconds].map((n) => String(n).padStart(2, '0')).join(':');
}
export function statusIsRunning(session: Session): boolean {
  return (
    session.status === 'active' || session.status === 'reconciling' || session.status === 'starting'
  );
}
export function shouldResumeOnStartup(
  session: Session,
  preferences: Preferences,
  now: number,
): boolean {
  if (session.status !== 'active' || isExpired(session, now) || !preferences.resumeOnBrowserRestart)
    return false;
  return session.expiresAt !== null || preferences.resumeUnlimitedOnRestart;
}
