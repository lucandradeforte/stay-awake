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

**Reprodutibilidade:** `package-lock.json` já versionado, instalação obrigatória por `npm ci`, Node 22 e npm 11.21.1. Scripts de instalação aprovados por pacote/versão. Ver a política de dependências.

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
- Falhas de badge/log não desfazem uma sessão ativa. Advertências retornam no snapshot da operação; como são transitórias, uma leitura posterior pode não repeti-las. A ausência de histórico não comprova ausência de falha.
- Uma indisponibilidade persistente de storage pode impedir a gravação do rollback. A resposta informa estado de erro, tenta liberar energia e evita anunciar a persistência como concluída.
- A matriz Windows continua pendente mesmo com os testes automatizados aprovados.

## ADR-006: Robustez e compensação

**Decisão:** validar integralmente sessão persistida, preferências e eventos. START confirma `active` somente depois de persistir estado e alarme. STOP libera energia antes de qualquer escrita de estado. Em vez de gravar `stopping` antes da liberação, encerra diretamente; o estado legado continua aceito e é recuperado ao acordar. Falhas críticas compensam power/alarmes, e erros secundários não impedem o retorno de um snapshot de erro.

**Trade-off:** a API power é síncrona, sem sensor de confirmação física; não usar um mock de Promise para representar seu contrato. Uma falha permanente do browser na liberação requer desativar a extensão, conforme o aviso. Badge e log são acessórios, com advertências transitórias. A fila é por instância do worker, e os listeners são registrados no topo do módulo.

## ADR-007: Operações de mídia e Wake Lock

**Decisão:** mídia vive num hook específico com geração monotônica; limpeza invalida promessas, retém o elemento usado e libera recursos uma vez. Resoluções antigas não podem parar uma fonte nova. Pausa cancela desenho e a pintura é limitada à cadência da captura. Wake Lock tem geração própria, consentimento por sessão e somente reaquisição por evento de visibilidade; release nativo não dispara loop de retry.

**Trade-off:** hooks permanecem pequenos e específicos. Testes de adaptadores reproduzem falhas e concorrência; Playwright verifica playback gerado real, sem inferir efeitos do vídeo sobre a política do Windows.

## ADR-008: Tooling, gates e canal

**Decisão:** ESLint 10 e Vitest 5 corrigem suporte/segurança; Tailwind 4 remove uma cadeia vulnerável sem patch disponível na linha anterior. Manter Vite 6 e TypeScript 5.8 evita upgrades extras. CI separa qualidade, segurança e E2E do ZIP, com traces de falhas por 14 dias. Manifesto continua numérico; tags candidatas usam `-rc.N`. Stable exige declaração documentada de QA Windows e dispatch manual no tag.

**Trade-off:** a confirmação do gate Windows depende da evidência humana e não é sensor de hardware. Verificações automatizadas e screenshots complementam, mas não substituem, aceite com tecnologia assistiva e escalas do Windows. Prettier padroniza a escrita em etapa separada das correções funcionais.
