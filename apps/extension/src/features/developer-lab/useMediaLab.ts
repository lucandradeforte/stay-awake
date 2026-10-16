import { useCallback, useEffect, useRef, useState } from 'react';

type Mode = 'generated' | 'file';
/** All resources belong to one generation; stale play promises cannot mutate it. */
export function useMediaLab() {
  const canvas = useRef<HTMLCanvasElement>(null);
  const video = useRef<HTMLVideoElement>(null);
  const resources = useRef<{
    element: HTMLVideoElement;
    stream?: MediaStream;
    url?: string;
    frame?: number;
    draw?: FrameRequestCallback;
  } | null>(null);
  const operation = useRef(0);
  const mounted = useRef(false);
  const [mode, setMode] = useState<Mode>('generated');
  const [status, setStatus] = useState('Parado');
  const [visibility, setVisibility] = useState(document.visibilityState);
  const [error, setError] = useState<string | null>(null);

  const clearSource = useCallback(() => {
    operation.current++;
    const previous = resources.current;
    resources.current = null;
    if (!previous) return;
    if (previous.frame !== undefined) cancelAnimationFrame(previous.frame);
    previous.stream?.getTracks().forEach((track) => track.stop());
    previous.element.pause();
    previous.element.removeAttribute('src');
    previous.element.srcObject = null;
    previous.element.load();
    if (previous.url) URL.revokeObjectURL(previous.url);
  }, []);
  const stop = useCallback(() => {
    clearSource();
    if (mounted.current) {
      setStatus('Parado');
      setError(null);
    }
  }, [clearSource]);
  useEffect(() => {
    mounted.current = true;
    const onVisibility = () => {
      setVisibility(document.visibilityState);
      if (document.visibilityState !== 'visible') stop();
    };
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      mounted.current = false;
      document.removeEventListener('visibilitychange', onVisibility);
      clearSource();
    };
  }, [clearSource, stop]);
  const eligible = () => {
    if (document.visibilityState === 'visible') return true;
    setError('Abra a página em primeiro plano.');
    return false;
  };
  const onPlaying = () => {
    const current = resources.current;
    if (!mounted.current || !current || document.visibilityState !== 'visible') return;
    if (current.draw && current.frame === undefined)
      current.frame = requestAnimationFrame(current.draw);
    setStatus(current.stream ? 'Reproduzindo vídeo gerado' : 'Reproduzindo arquivo local');
  };
  const onPause = () => {
    const current = resources.current;
    if (!current) return;
    operation.current++;
    if (current.frame !== undefined) cancelAnimationFrame(current.frame);
    current.frame = undefined;
    setStatus('Pausado');
  };
  const onMediaError = () => {
    if (!resources.current) return;
    stop();
    setError('Não foi possível reproduzir a mídia local. Verifique o formato ou tente novamente.');
  };
  const play = async () => {
    const current = resources.current;
    if (!current || !eligible()) return;
    const token = ++operation.current;
    try {
      await current.element.play();
      if (mounted.current && token === operation.current && current === resources.current)
        onPlaying();
    } catch {
      if (!mounted.current || token !== operation.current || current !== resources.current) return;
      onMediaError();
    }
  };
  const startGenerated = async () => {
    stop();
    if (!eligible()) return;
    const target = canvas.current;
    const element = video.current;
    if (!target?.captureStream || !element) {
      setError('Canvas captureStream indisponível.');
      return;
    }
    try {
      const context = target.getContext('2d');
      if (!context) {
        setError('Não foi possível criar o canvas 2D.');
        return;
      }
      // Paint before capture; redraw at the stream cadence instead of every display frame.
      const paint = (time: number) => {
        context.fillStyle = '#0e1417';
        context.fillRect(0, 0, target.width, target.height);
        const x = 40 + (Math.sin(time / 3000) + 1) * 180;
        const gradient = context.createRadialGradient(x, 140, 12, x, 140, 140);
        gradient.addColorStop(0, '#8fdcb1');
        gradient.addColorStop(1, '#152b25');
        context.fillStyle = gradient;
        context.fillRect(0, 0, target.width, target.height);
        context.fillStyle = '#e7eaf0';
        context.font = '500 21px Segoe UI';
        context.fillText('Stay Awake · Media Lab', 22, 40);
        context.font = '15px Segoe UI';
        context.fillText('Vídeo gerado localmente — experimento visível', 22, 270);
      };
      paint(0);
      const captured = target.captureStream(12);
      const current = {
        element,
        stream: captured,
        frame: undefined as number | undefined,
        draw: undefined as FrameRequestCallback | undefined,
      };
      resources.current = current;
      let previousTime = 0;
      current.draw = (time) => {
        if (resources.current !== current || document.visibilityState !== 'visible') return;
        if (time - previousTime >= 1000 / 12) {
          paint(time);
          previousTime = time;
        }
        current.frame = requestAnimationFrame(current.draw!);
      };
      element.srcObject = captured;
      element.muted = true;
      await play();
    } catch {
      stop();
      setError('Não foi possível criar o vídeo gerado neste navegador.');
    }
  };
  const onFile = async (file?: File) => {
    stop();
    if (!file || !video.current || !eligible()) return;
    if (!file.type.startsWith('video/')) {
      setError('Selecione um arquivo de vídeo válido.');
      return;
    }
    if (file.size > 100 * 1024 * 1024) {
      setError('Limite local de 100 MB por arquivo.');
      return;
    }
    try {
      const element = video.current;
      const url = URL.createObjectURL(file);
      resources.current = { element, url };
      element.src = url;
      element.muted = false;
      await play();
    } catch {
      stop();
      setError('Não foi possível abrir o vídeo local.');
    }
  };
  const pause = () => {
    const current = resources.current;
    if (!current) return;
    if (current.element.paused) void play();
    else {
      current.element.pause();
      onPause();
    }
  };
  return {
    canvas,
    video,
    mode,
    setMode,
    status,
    visibility,
    error,
    stop,
    startGenerated,
    onFile,
    pause,
    onPause,
    onPlaying,
    onMediaError,
  };
}
