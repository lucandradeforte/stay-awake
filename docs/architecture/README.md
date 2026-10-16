# Arquitetura — Stay Awake v1.0

## ADR-001: Extensão Chromium com base única

**Decisão:** Manifest V3, React + Vite + TypeScript, build único para Chrome/Edge. O site é um segundo aplicativo Vite estático. Não requer backend.

**Trade-off:** A UI não tem acesso direto ao Windows. O serviço em background pode ser suspenso a qualquer momento. Dados autoritativos vivem no `chrome.storage.local`.

## ADR-002: Engine de energia

**Decisão:** `chrome.power` no service worker, níveis `display` ou `system`. A interface não chama a API de energia diretamente. `navigator.wakeLock` é opcional no Workspace quando visível. Reprodução HTML5 é um laboratório visível e isolado.

**Trade-off:** Solicitação enviada à API não equivale a garantia de monitor ligado, sessão desbloqueada ou confirmação do estado do sistema operacional. A extensão não chama `CreateVideoPowerSaveBlocker` nem emula presença.

## ADR-003: Persistência e reconciliação

**Decisão:** `chrome.storage.local` tem snapshot (sessão + preferências) e logs limitados. `chrome.alarms` mantém alarme por sessão (ID UUID) com horário absoluto. START/STOP/ALARM são serializados dentro do worker. Alarmes anteriores ignorados por comparação do ID. Após interrupção do worker, reconciliação idempotente; após reiniciar o navegador, retomar apenas com opt-in.

**Trade-off:** Exatidão de segundo não é contratual. Não é possível observar diretamente o lock screen do Windows. `chrome.power` pode permanecer ativo ou ser reiniciado conforme ciclo de vida do navegador.

## ADR-004: Monorepo npm

**Decisão:** npm workspaces (em lugar do pnpm sugerido no documento de direção) para reduzir dependência de um gerenciador adicional no Windows. Monorepo permanece com `apps/` e `packages/`.

**Nota de release:** O primeiro `npm install` gera `package-lock.json`, que deve ser versionado no repositório. O ambiente de geração não tinha acesso ao registro npm para gerar este lockfile ou executar build de dependências.

## ADR-005: Site, distribuição e permissões

**Decisão:** GitHub Pages publica apenas documentação e landing page; Releases publica ZIP da extensão compilada. Instalação via `Load unpacked`. Permissões restritas a `power`, `storage`, `alarms`. Nenhum dado é enviado automaticamente.

## Contrato de mensagens

- `SESSION_GET` → snapshot
- `SESSION_START(level,durationMinutes)` → snapshot
- `SESSION_STOP` → snapshot
- `SESSION_UPDATE_DURATION(durationMinutes)` → reinicia contagem e snapshot
- `PREFERENCES_SET(patch)` → merge de propriedades validadas
- `DIAGNOSTIC_CLEAR` → apaga eventos locais
- `RESET_LOCAL_DATA` → libera solicitação e limpa dados

`durationMinutes` é `null` para indefinido ou inteiro de 1 a 1440. Estado inclui `inactive`, `starting`, `active`, `stopping`, `expired`, `reconciling`, `error`.

## Limitações operacionais

- Estado `active` significa confirmação de chamada à API, não sensor físico do display.
- Reload de extensão ou browser restart exige testes E2E locais, pois APIs de execução são vinculadas ao ciclo de vida Chromium.
- Erros de I/O ao persistir eventos após START podem afetar a percepção da UI: uma melhoria futura é separar explicitamente falha de log versus falha de energia; validar com fault injection.
