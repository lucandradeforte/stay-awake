import { useEffect, useRef, useState } from 'react';
import { RiPlayLine, RiPauseLine, RiStopLine, RiFileVideoLine } from '@remixicon/react';
import { Button, Card } from '../../components/ui';

type Mode = 'generated' | 'file';
export function VideoLab() {
  const canvas = useRef<HTMLCanvasElement>(null);
  const video = useRef<HTMLVideoElement>(null);
  const stream = useRef<MediaStream | null>(null);
  const fileUrl = useRef<string | null>(null);
  const frame = useRef<number | null>(null);
  const [mode, setMode] = useState<Mode>('generated');
  const [status, setStatus] = useState('Parado');
  const [visibility, setVisibility] = useState(document.visibilityState);
  const [error, setError] = useState<string | null>(null);
  const clearSource = () => {
    if (frame.current !== null) cancelAnimationFrame(frame.current);
    frame.current = null;
    stream.current?.getTracks().forEach(track => track.stop());
    stream.current = null;
    if (video.current) { video.current.pause(); video.current.removeAttribute('src'); video.current.srcObject = null; video.current.load(); }
    if (fileUrl.current) URL.revokeObjectURL(fileUrl.current);
    fileUrl.current = null;
  };
  const stop = () => { clearSource(); setStatus('Parado'); setError(null); };
  useEffect(() => {
    const onVisibility = () => { setVisibility(document.visibilityState); if (document.visibilityState !== 'visible') stop(); };
    document.addEventListener('visibilitychange', onVisibility);
    return () => { document.removeEventListener('visibilitychange', onVisibility); clearSource(); };
  }, []);
  const startGenerated = async () => {
    stop();
    if (document.visibilityState !== 'visible') { setError('Abra a página em primeiro plano.'); return; }
    if (!canvas.current || !video.current || !canvas.current.captureStream) { setError('Canvas captureStream indisponível.'); return; }
    const context = canvas.current.getContext('2d');
    if (!context) { setError('Não foi possível criar o canvas 2D.'); return; }
    let n = 0;
    const draw = () => {
      if (document.visibilityState !== 'visible') return;
      const c = canvas.current!;
      context.fillStyle = '#0e1417'; context.fillRect(0, 0, c.width, c.height);
      const x = 40 + (Math.sin(n / 38) + 1) * 180;
      const gradient = context.createRadialGradient(x, 140, 12, x, 140, 140);
      gradient.addColorStop(0, '#8fdcb1'); gradient.addColorStop(1, '#152b25');
      context.fillStyle = gradient; context.fillRect(0, 0, c.width, c.height);
      context.fillStyle = '#e7eaf0'; context.font = '500 21px Segoe UI'; context.fillText('Stay Awake · Media Lab', 22, 40);
      context.fillStyle = '#a0aeb8'; context.font = '15px Segoe UI'; context.fillText('Vídeo gerado localmente — experimento visível', 22, 270);
      n++; frame.current = requestAnimationFrame(draw);
    };
    draw();
    const captured = canvas.current.captureStream(12);
    stream.current = captured;
    video.current.srcObject = captured;
    video.current.muted = true;
    try { await video.current.play(); setStatus('Reproduzindo vídeo gerado'); }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'Playback recusado.'); stop(); }
  };
  const onFile = async (file?: File) => {
    stop(); if (!file || !video.current) return;
    if (!file.type.startsWith('video/')) { setError('Selecione um arquivo de vídeo válido.'); return; }
    if (file.size > 100 * 1024 * 1024) { setError('Limite local de 100 MB por arquivo.'); return; }
    fileUrl.current = URL.createObjectURL(file);
    video.current.src = fileUrl.current;
    video.current.muted = false;
    try { await video.current.play(); setStatus('Reproduzindo arquivo local'); }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'Falha ao iniciar playback.'); }
  };
  const pause = () => {
    if (!video.current) return;
    if (video.current.paused) { void video.current.play().then(()=>setStatus('Reproduzindo')).catch(e=>setError(String(e))); }
    else { video.current.pause(); setStatus('Pausado'); }
  };
  return <Card>
    <div className="section-title"><h2><RiFileVideoLine size={20}/> Media Lab</h2><span className="beta-badge">BETA / DEV</span></div>
    <p className="muted">Experimento visível de reprodução de vídeo HTML5. Não há solicitação direta ao bloqueador nativo do Chromium, nem garantia de manter o Windows desbloqueado.</p>
    <div className="segment spaced" role="group" aria-label="Origem de vídeo">
      <button aria-pressed={mode==='generated'} className={mode==='generated'?'selected':''} onClick={()=>{stop();setMode('generated');}}>Canvas → vídeo</button>
      <button aria-pressed={mode==='file'} className={mode==='file'?'selected':''} onClick={()=>{stop();setMode('file');}}>Arquivo local</button>
    </div>
    <div className="media-frame"><canvas ref={canvas} width={480} height={300} hidden/><video ref={video} width="480" height="300" controls playsInline onEnded={()=>setStatus('Finalizado')} onPause={()=>setStatus(s=>s.startsWith('Reproduzindo')?'Pausado':s)} aria-label="Vídeo experimental"/></div>
    {mode==='file' && <label className="field spaced"><span>Escolher vídeo local (não enviado à rede)</span><input type="file" accept="video/*" onChange={e=>{void onFile(e.target.files?.[0]); e.currentTarget.value='';}}/></label>}
    <div className="action-row spaced">
      {mode==='generated' && <Button onClick={()=>void startGenerated()}><RiPlayLine size={18}/> Iniciar reprodução</Button>}
      <Button variant="secondary" onClick={pause} disabled={status==='Parado'}><RiPauseLine size={17}/> Pausar / retomar</Button>
      <Button variant="secondary" onClick={stop}><RiStopLine size={18}/> Parar</Button>
    </div>
    <div className="session-details"><div><span>Estado</span><strong>{status}</strong></div><div><span>Visibilidade</span><strong>{visibility}</strong></div><div><span>Origem</span><strong>{mode === 'generated' ? 'Canvas (12 fps)' : 'Arquivo do usuário'}</strong></div></div>
    {error && <p className="inline-error" role="alert">{error}</p>}
    <p className="helper">A reprodução é interrompida ao ocultar esta aba. Comparações precisam ser verificadas manualmente; reproduzir mídia não garante um bloqueio de economia de energia.</p>
  </Card>;
}
