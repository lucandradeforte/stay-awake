import { useCallback, useEffect, useRef, useState } from 'react';
/** Browser may revoke the sentinel at any moment. This hook only runs in a visible document. */
export function useWakeLock(sessionActive: boolean) {
  const [enabled, setEnabled] = useState(false);
  const [acquired, setAcquired] = useState(false);
  const [message, setMessage] = useState('Desativado');
  const sentinel = useRef<WakeLockSentinel | null>(null);
  const wanted = useRef(false);
  const inFlight = useRef(false);
  const activeRef = useRef(sessionActive);
  activeRef.current = sessionActive;
  const release = useCallback(async () => {
    const previous = sentinel.current;
    sentinel.current = null;
    setAcquired(false);
    if (previous && !previous.released) await previous.release();
  }, []);
  const acquire = useCallback(async () => {
    if (!wanted.current || !activeRef.current || document.visibilityState !== 'visible' || inFlight.current) return;
    if (sentinel.current && !sentinel.current.released) return;
    if (!('wakeLock' in navigator)) { setMessage('Screen Wake Lock indisponível neste navegador.'); return; }
    inFlight.current = true;
    try {
      const acquiredSentinel = await navigator.wakeLock.request('screen');
      if (!wanted.current || !activeRef.current || document.visibilityState !== 'visible') {
        await acquiredSentinel.release();
        return;
      }
      sentinel.current = acquiredSentinel;
      acquiredSentinel.addEventListener('release', () => {
        if (sentinel.current === acquiredSentinel) sentinel.current = null;
        setAcquired(false);
        setMessage('Wake Lock liberado pelo navegador.');
      }, { once: true });
      setAcquired(true); setMessage('Solicitação de Wake Lock adquirida.');
    } catch (error) {
      setAcquired(false);
      setMessage(error instanceof Error ? error.message : 'Wake Lock recusado.');
    } finally { inFlight.current = false; }
  }, []);
  const updateEnabled = useCallback((next: boolean) => {
    wanted.current = next;
    setEnabled(next);
    if (next) void acquire();
    else { void release(); setMessage('Desativado'); }
  }, [acquire, release]);
  useEffect(() => {
    if (!sessionActive) { wanted.current = false; setEnabled(false); setMessage('Inicie uma sessão antes de ativar Wake Lock.'); void release(); }
  }, [sessionActive, release]);
  useEffect(() => {
    const onVisibility = () => {
      if (document.visibilityState === 'visible' && wanted.current) void acquire();
      else { void release(); if (wanted.current) setMessage('Página oculta: solicitação liberada.'); }
    };
    document.addEventListener('visibilitychange', onVisibility);
    return () => { wanted.current = false; document.removeEventListener('visibilitychange', onVisibility); void release(); };
  }, [acquire, release]);
  return { enabled, acquired, message, setEnabled: updateEnabled };
}
