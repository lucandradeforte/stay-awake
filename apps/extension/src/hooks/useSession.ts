import { useCallback, useEffect, useState } from 'react';
import {
  LOG_KEY, PREFS_KEY, SESSION_KEY, type Command, type Snapshot
} from '@stay-awake/contracts';
import { readableError, send } from '../lib/messenger';
export function useSession() {
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [now, setNow] = useState(Date.now());
  const refresh = useCallback(async () => {
    try { setSnapshot(await send({ type: 'SESSION_GET' })); setError(null); }
    catch (cause) { setError(readableError(cause)); }
  }, []);
  useEffect(() => {
    void refresh();
    const listener = (changes: Record<string, chrome.storage.StorageChange>, area: string) => {
      if (area === 'local' && [SESSION_KEY, PREFS_KEY, LOG_KEY].some(key => changes[key])) void refresh();
    };
    chrome.storage.onChanged.addListener(listener);
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => { chrome.storage.onChanged.removeListener(listener); window.clearInterval(timer); };
  }, [refresh]);
  const dispatch = useCallback(async (command: Command) => {
    setPending(true); setError(null);
    try { const next = await send(command); setSnapshot(next); return next; }
    catch (cause) { setError(readableError(cause)); return undefined; }
    finally { setPending(false); }
  }, []);
  return { snapshot, pending, error, now, refresh, dispatch, clearError: () => setError(null) };
}
