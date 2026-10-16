import { useCallback, useEffect, useRef, useState } from 'react';
/** Consent belongs to the active session and a visible, mounted document. */
export function useWakeLock(sessionActive: boolean) {
  const [enabled, setEnabled] = useState(false);
  const [acquired, setAcquired] = useState(false);
  const [message, setMessage] = useState('Desativado');
  const sentinel = useRef<WakeLockSentinel | null>(null);
  const wanted = useRef(false);
  const generation = useRef(0);
  const inFlight = useRef<number | null>(null);
  const mounted = useRef(false);
  const activeRef = useRef(sessionActive);
  activeRef.current = sessionActive;
  const release = useCallback(async () => {
    generation.current++;
    inFlight.current = null;
    const previous = sentinel.current;
    sentinel.current = null;
    if (mounted.current) setAcquired(false);
    try { if (previous && !previous.released) await previous.release(); }
    catch { if (mounted.current) setMessage('Não foi possível confirmar a liberação de Wake Lock.'); }
  }, []);
  const acquire = useCallback(async () => {
    if (!mounted.current || !wanted.current || !activeRef.current || document.visibilityState !== 'visible' || inFlight.current !== null) return;
    if (sentinel.current && !sentinel.current.released) return;
    if (!('wakeLock' in navigator)) { setMessage('Screen Wake Lock indisponível neste navegador.'); return; }
    const token = ++generation.current;
    inFlight.current = token;
    try {
      const acquiredSentinel = await navigator.wakeLock.request('screen');
      if (token !== generation.current || !mounted.current || !wanted.current || !activeRef.current || document.visibilityState !== 'visible') {
        await acquiredSentinel.release(); return;
      }
      if (acquiredSentinel.released) { setMessage('Wake Lock já liberado pelo navegador.'); return; }
      sentinel.current = acquiredSentinel;
      acquiredSentinel.addEventListener('release', () => {
        if (!mounted.current || sentinel.current !== acquiredSentinel) return;
        sentinel.current = null; setAcquired(false); setMessage('Wake Lock liberado pelo navegador.');
      }, { once: true });
      setAcquired(true); setMessage('Solicitação de Wake Lock adquirida.');
    } catch {
      if (mounted.current && token === generation.current) {
        setAcquired(false); setMessage('Wake Lock recusado pelo navegador ou pela plataforma.');
      }
    } finally { if (inFlight.current === token) inFlight.current = null; }
  }, []);
  const updateEnabled = useCallback((next: boolean) => {
    wanted.current = next && activeRef.current;
    setEnabled(wanted.current);
    if (wanted.current) void acquire();
    else { setMessage('Desativado'); void release(); }
  }, [acquire, release]);
  useEffect(() => {
    if (!sessionActive) { wanted.current = false; setEnabled(false); setMessage('Inicie uma sessão antes de ativar Wake Lock.'); void release(); }
  }, [sessionActive, release]);
  useEffect(() => {
    mounted.current = true;
    const onVisibility = () => {
      if (document.visibilityState === 'visible' && wanted.current) void acquire();
      else { void release(); if (wanted.current) setMessage('Página oculta: solicitação liberada.'); }
    };
    document.addEventListener('visibilitychange', onVisibility);
    return () => { mounted.current = false; wanted.current = false; document.removeEventListener('visibilitychange', onVisibility); void release(); };
  }, [acquire, release]);
  return { enabled, acquired, message, setEnabled: updateEnabled };
}
