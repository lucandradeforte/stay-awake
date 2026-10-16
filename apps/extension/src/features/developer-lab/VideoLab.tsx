import { RiPlayLine, RiPauseLine, RiStopLine, RiFileVideoLine } from "@remixicon/react";
import { Button, Card } from "../../components/ui";
import { useMediaLab } from "./useMediaLab";

export function VideoLab() {
  const { canvas, video, mode, setMode, status, visibility, error, stop,
    startGenerated, onFile, pause, onPause, onPlaying, onMediaError } = useMediaLab();
  return (
    <Card>
      <div className="section-title">
        <h2>
          <RiFileVideoLine size={20} /> Media Lab
        </h2>
        <span className="beta-badge">BETA / DEV</span>
      </div>
      <p className="muted">
        Experimento visível de reprodução de vídeo HTML5. Não há solicitação
        direta ao bloqueador nativo do Chromium, nem garantia de manter o
        Windows desbloqueado.
      </p>
      <div className="segment spaced" role="group" aria-label="Origem de vídeo">
        <button
          aria-pressed={mode === "generated"}
          className={mode === "generated" ? "selected" : ""}
          onClick={() => {
            stop();
            setMode("generated");
          }}
        >
          Canvas → vídeo
        </button>
        <button
          aria-pressed={mode === "file"}
          className={mode === "file" ? "selected" : ""}
          onClick={() => {
            stop();
            setMode("file");
          }}
        >
          Arquivo local
        </button>
      </div>
      <div className="media-frame">
        <canvas ref={canvas} width={480} height={300} hidden />
        <video
          ref={video}
          width="480"
          height="300"
          controls
          playsInline
          onEnded={stop}
          onPause={onPause}
          onPlaying={onPlaying}
          onError={onMediaError}
          aria-label="Vídeo experimental"
        />
      </div>
      {mode === "file" && (
        <label className="field spaced">
          <span>Escolher vídeo local (não enviado à rede)</span>
          <input
            type="file"
            accept="video/*"
            onChange={(e) => {
              void onFile(e.target.files?.[0]);
              e.currentTarget.value = "";
            }}
          />
        </label>
      )}
      <div className="action-row spaced">
        {mode === "generated" && (
          <Button onClick={() => void startGenerated()}>
            <RiPlayLine size={18} /> Iniciar reprodução
          </Button>
        )}
        <Button
          variant="secondary"
          onClick={pause}
          disabled={status === "Parado"}
        >
          <RiPauseLine size={17} /> Pausar / retomar
        </Button>
        <Button variant="secondary" onClick={stop}>
          <RiStopLine size={18} /> Parar
        </Button>
      </div>
      <div className="session-details">
        <div>
          <span>Estado</span>
          <strong>{status}</strong>
        </div>
        <div>
          <span>Visibilidade</span>
          <strong>{visibility}</strong>
        </div>
        <div>
          <span>Origem</span>
          <strong>
            {mode === "generated" ? "Canvas (12 fps)" : "Arquivo do usuário"}
          </strong>
        </div>
      </div>
      {error && (
        <p className="inline-error" role="alert">
          {error}
        </p>
      )}
      <p className="helper">
        A reprodução é interrompida ao ocultar esta aba. Comparações precisam
        ser verificadas manualmente; reproduzir mídia não garante um bloqueio de
        economia de energia.
      </p>
    </Card>
  );
}
