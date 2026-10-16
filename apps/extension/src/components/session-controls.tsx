import { useEffect, useState } from "react";
import {
  RiShutDownLine,
  RiTimerLine,
  RiBatteryChargeLine,
  RiClockwiseLine,
} from "@remixicon/react";
import {
  DURATIONS,
  formatDuration,
  remainingMs,
  statusIsRunning,
  type PowerLevel,
  type Snapshot,
  type Command,
} from "@stay-awake/contracts";
import { Button, InlineError, NumberInput, StatusPill } from "./ui";

type Props = {
  snapshot: Snapshot | null;
  pending: boolean;
  error: string | null;
  now: number;
  dispatch: (command: Command) => Promise<Snapshot>;
  variant?: "popup" | "workspace";
};
export function SessionControls({
  snapshot,
  pending,
  error,
  now,
  dispatch,
  variant = "popup",
}: Props) {
  const session = snapshot?.session;
  const preferences = snapshot?.preferences;
  const running = !!session && statusIsRunning(session);
  const [duration, setDuration] = useState<number | null>(60);
  const [custom, setCustom] = useState(false);
  const [level, setLevel] = useState<PowerLevel>("display");
  const defaultDurationMinutes = preferences?.defaultDurationMinutes;
  const defaultLevel = preferences?.defaultLevel;
  useEffect(() => {
    if (
      defaultDurationMinutes !== undefined &&
      defaultLevel !== undefined &&
      !running
    ) {
      setDuration(defaultDurationMinutes);
      setLevel(defaultLevel);
    }
  }, [defaultDurationMinutes, defaultLevel, running]);
  const start = async () => {
    await dispatch({ type: "SESSION_START", durationMinutes: duration, level });
  };
  const stop = async () => {
    await dispatch({ type: "SESSION_STOP" });
  };
  const busy =
    pending || session?.status === "starting" || session?.status === "stopping";
  return (
    <div className={"session-controls " + variant}>
      <div className="center-display">
        <div
          className={"power-orb " + (running ? "orb-active" : "")}
          aria-hidden="true"
        >
          <RiShutDownLine size={44} />
        </div>
        <h1>
          {running
            ? "Tela solicitada ativa"
            : session?.status === "error"
              ? "Falha na solicitação"
              : "Pronto para iniciar"}
        </h1>
        {session && <StatusPill status={session.status} />}
        {running && (
          <div className="timer">
            <RiTimerLine size={17} />
            <span className="timer-numbers">
              {formatDuration(remainingMs(session!, now))}
            </span>
          </div>
        )}
        <p className="muted small">
          {running
            ? session?.expiresAt
              ? "Tempo restante estimado"
              : "Ativo até você encerrar"
            : "Solicite manter a tela ou sistema acordados"}
        </p>
      </div>
      {!running && (
        <>
          <div className="divider" />
          <div className="label-row">
            <label className="control-label">Duração da sessão</label>
            <span className="small muted">
              {duration === null ? "Indefinida" : `${duration} min`}
            </span>
          </div>
          <div
            className="duration-grid"
            role="group"
            aria-label="Duração da sessão"
          >
            {DURATIONS.map((minutes) => (
              <button
                disabled={busy}
                type="button"
                aria-pressed={!custom && duration === minutes}
                className={
                  "choice " +
                  (!custom && duration === minutes ? "selected" : "")
                }
                key={minutes}
                onClick={() => {
                  setCustom(false);
                  setDuration(minutes);
                }}
              >
                {minutes < 60 ? `${minutes} min` : `${minutes / 60} h`}
              </button>
            ))}
            <button
              disabled={busy}
              type="button"
              aria-pressed={custom}
              className={"choice " + (custom ? "selected" : "")}
              onClick={() => {
                setCustom(true);
                setDuration(90);
              }}
            >
              Outro tempo
            </button>
            <button
              disabled={busy}
              type="button"
              aria-pressed={!custom && duration === null}
              className={
                "choice " + (!custom && duration === null ? "selected" : "")
              }
              onClick={() => {
                setCustom(false);
                setDuration(null);
              }}
            >
              Sem limite
            </button>
          </div>
          {custom && (
            <NumberInput
              label="Duração personalizada (1 a 1440 min)"
              min={1}
              max={1440}
              step={1}
              value={duration ?? 90}
              onChange={(e) => setDuration(Number(e.target.value))}
            />
          )}
          <div className="label-row label-margin">
            <span className="control-label">Controle de energia</span>
            <RiBatteryChargeLine size={16} className="muted" />
          </div>
          <div className="segment" role="group" aria-label="Modo de energia">
            <button
              type="button"
              disabled={busy}
              aria-pressed={level === "display"}
              className={level === "display" ? "selected" : ""}
              onClick={() => setLevel("display")}
            >
              Tela + sistema
            </button>
            <button
              type="button"
              disabled={busy}
              aria-pressed={level === "system"}
              className={level === "system" ? "selected" : ""}
              onClick={() => setLevel("system")}
            >
              Só sistema
            </button>
          </div>
          {duration === null && (
            <p className="helper warning">
              Sessões sem limite podem aumentar o consumo de bateria. Encerre
              quando não precisar mais.
            </p>
          )}
        </>
      )}
      {running && (
        <div className="session-details">
          <div>
            <span>Modo</span>
            <strong>
              {session?.level === "display"
                ? "Tela + sistema"
                : "Somente sistema"}
            </strong>
          </div>
          <div>
            <span>Expira</span>
            <strong>
              {session?.expiresAt
                ? new Date(session.expiresAt).toLocaleString("pt-BR")
                : "Manualmente"}
            </strong>
          </div>
        </div>
      )}
      <InlineError message={error ?? session?.lastError?.message ?? null} />
      <Button
        className="full primary-cta"
        disabled={
          busy ||
          (!running &&
            custom &&
            (!Number.isInteger(duration) ||
              (duration ?? 0) < 1 ||
              (duration ?? 0) > 1440))
        }
        variant={running ? "secondary" : "primary"}
        onClick={() => void (running ? stop() : start())}
      >
        {running ? (
          <>
            <RiShutDownLine size={19} /> Parar sessão
          </>
        ) : (
          <>
            <RiShutDownLine size={19} /> Iniciar sessão
          </>
        )}
      </Button>
      {running && (
        <Button
          className="full"
          variant="quiet"
          disabled={busy}
          onClick={() =>
            void dispatch({
              type: "SESSION_UPDATE_DURATION",
              durationMinutes: session?.durationMinutes ?? 60,
            })
          }
        >
          <RiClockwiseLine size={17} /> Reiniciar prazo
        </Button>
      )}
      <p className="fineprint">
        Solicitações de energia não substituem as políticas de bloqueio do
        Windows.
      </p>
    </div>
  );
}
