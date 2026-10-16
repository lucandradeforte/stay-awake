# Stay Awake — direção de produto e engenharia

Versão 1.2, 16/10/2026. **Beta técnica em estabilização; versão estável não homologada.** O manifesto declara `1.0.0`, mas isso não comprova uma release estável.

A revisão preserva a direção detalhada [v1.1 fornecida pelo mantenedor](reference/product-direction-audit-2026-10-16.md), reconcilia suas afirmações com o repositório e registra os resultados em [validação da estabilização](testing/stabilization.md). A referência histórica não é um checklist concluído. Código, contratos, workflows e evidências atuais prevalecem sobre hipóteses da concepção inicial.

## Produto e limites

Stay Awake é uma extensão Manifest V3 local para solicitar que tela e/ou computador permaneçam acordados. O mecanismo principal é `chrome.power`, executado exclusivamente pelo service worker. O popup pode ser fechado após iniciar a sessão. O mesmo bundle é destinado a Chrome e Edge desktop; a homologação dos dois no Windows permanece um gate próprio.

- `display`: solicita manter tela e sistema acordados.
- `system`: solicita impedir suspensão por inatividade, permitindo apagar a tela.
- Workspace: painel opcional, temas dark/light, diagnóstico e ajuda.
- Screen Wake Lock: opt-in restrito à sessão ativa e ao documento visível; pode ser revogado.
- Media Lab: opt-in Beta/Dev para vídeo HTML5 visível, local ou gerado por Canvas. Não é uma segunda engine autoritativa de sessão.
- Website: apresentação e instruções públicas via GitHub Pages; não recebe permissões de extensão.

A API confirma uma solicitação ao navegador. Não observa nem garante tela fisicamente ligada, ausência de suspensão ou Windows desbloqueado. Não há simulação de mouse/teclado, alteração do Registro, processos nativos, neutralização de políticas ou reprodução oculta. O uso em ambientes administrados depende das autorizações aplicáveis.

## Requisitos funcionais preservados

| ID       | Requisito                        | Implementação/evidência corrente                                                                           |
| -------- | -------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| RF-01/02 | Iniciar `display` e parar sessão | Controller, regressão de falhas e E2E; liberação física exige QA Windows                                   |
| RF-03/04 | Presets e duração personalizada  | 15/30/60/120/240/480 min; custom inteiro 1..1440, validado na UI e no background                           |
| RF-05    | Indefinido explícito             | Sem alarme, aviso de consumo, badge `∞`, encerramento manual                                               |
| RF-06    | Expiração automática             | `expiresAt` absoluto e `chrome.alarms`; teste real de 1 min sem páginas da UI abertas                      |
| RF-07    | Recuperação do worker            | Revalidação de estado e recriação do alarme; teste CDP interrompe worker                                   |
| RF-08/09 | Estado, erro e badge             | Snapshot tipado, informações de sessão, indicação de solicitação e advertência de falha acessória          |
| RF-10/11 | Workspace e tema                 | Tema persistido; popup sempre dark; E2E nos dois temas                                                     |
| RF-12    | Screen Wake Lock                 | Consentimento por sessão, geração assíncrona, release/hidden/unmount e falhas testados com adaptadores     |
| RF-13    | Diagnóstico local                | Modo, horários e até 80 eventos; erro sanitizado, cópia explícita e limpeza                                |
| RF-14/15 | Beta/Dev e vídeo                 | OFF por padrão, controles visíveis, limpeza e regressões de concorrência; 50 ciclos instrumentados         |
| RF-16    | Modo `system`                    | Mesmo fluxo de sessão; E2E confirma contrato e ausência de alarme em modo indefinido                       |
| RF-17/19 | Ajuda e feedback                 | README, FAQ, repositório e Issues; sem envio automático de diagnóstico                                     |
| RF-18    | Instalação Chrome/Edge           | ZIP único com `manifest.json` na raiz; E2E instala pacote extraído em Chromium; browsers Windows pendentes |
| RF-20    | Exclusão local                   | Stop antes de limpar dados; configurações voltam ao padrão                                                 |

A tabela descreve implementação e evidência automatizada; não substitui aceite humano, teste físico de energia nem certificação de acessibilidade. A idade mínima efetivamente homologada de Chrome/Edge permanece aberta. Defaults existem no contrato/preferências; a tela atual não oferece um editor completo de presets/defaults, considerado refinamento de UX posterior à estabilização.

## Regras de sessão e recuperação

O background serializa mensagens e eventos nativos na mesma fila. Valida entradas em runtime e aceita somente mensagens da própria extensão. Preferências passam por parser de campos conhecidos. Sessões armazenadas precisam de schema, estado, modo e timestamps coerentes; dados malformados não autorizam ativação.

START libera pedido anterior, remove alarmes próprios, salva `starting`, chama a API síncrona de energia, cria alarme finito e salva `active`. Falhas críticas tentam liberar energia e limpar alarmes; falhas secundárias de compensação não substituem o erro principal. Mesmo sem poder persistir o erro, a resposta apresenta estado de erro e limitações de recuperação.

STOP libera energia antes do I/O de armazenamento e alarmes. Não depende de conseguir gravar uma transição `stopping`. O estado continua reconhecendo `stopping` para recuperar dados de versões anteriores. Badge e histórico são acessórios: uma falha nesses canais gera advertência e não desfaz uma solicitação de energia validamente registrada.

- Worker acordando: retoma somente sessão válida ainda ativa/reconciliando; recria alarme perdido.
- Prazo vencido: encerra e marca `expired`; não depende de precisão de segundos.
- Browser startup e atualização/reload: retomada finita requer `resumeOnBrowserRestart`; indefinida exige também `resumeUnlimitedOnRestart`.
- Padrão de ambas as permissões de retomada: OFF.
- `starting` interrompido: erro e compensação; `stopping` interrompido: conclusão do encerramento.
- Alarmes antigos não encerram uma sessão nova. Alarmes não usam `persistAcrossSessions`, por portabilidade.

## Interface, privacidade e performance

Popup dark fixo e Workspace dark por padrão, light opt-in. Estado é comunicado por texto e ícone, com foco visível, controles acessíveis e movimento reduzido. O cronômetro usa números tabulares; seu intervalo de UI não mantém o worker artificialmente vivo.

A UI reflete snapshots do background e trata rejeições sem produzir unhandled promises. Falhas de configuração/diagnóstico devem continuar visíveis. “Solicitação ativa” descreve a API; não uma medição externa do Windows.

Vídeo só funciona em documento visível. Stop, troca de fonte, navegação, ocultação e desmontagem invalidam promessas antigas e encerram tracks, RAF e Object URLs. Pausa suspende o desenho; o Canvas limita a pintura à cadência de aproximadamente 12 fps. Isso não é uma medição de economia de CPU/GPU.

A extensão pede apenas `power`, `storage` e `alarms`. Sem host permissions, conta, backend, analytics ou upload de arquivo. Nenhum nome/caminho de vídeo local é registrado em mensagem de erro do player. Diagnóstico é copiado somente por ação explícita. O site utiliza links públicos, sem privilégios do navegador.

## Stack e decisões

- React 19, TypeScript 5.8, Vite 6, npm workspaces e lockfile versionado.
- Tailwind 4/PostCSS, tokens CSS compartilhados, componentes próprios e Radix Switch; não há catálogo shadcn/ui instalado.
- Node 22, mínimo 22.13; npm 11.21.1 com script `esbuild@0.25.12` aprovado de forma restrita.
- ESLint 10, Vitest 5, Testing Library/jsdom, Playwright Chromium e axe-core.
- ZIP e SHA-256 criados com Node e Python 3, com metadados fixos e inventário conferido.
- Licença MIT já presente no repositório. Não foi trocada nesta revisão.

Detalhes e trade-offs: [arquitetura](architecture/README.md), [dependências](security/dependencies.md), [design system](design/design-system.md).

## Roadmap reconciliado

| Etapa          | Situação                                                | Evidência/gate restante                                                                                                     |
| -------------- | ------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| SA-101         | Correção e regressões automatizadas concluídas          | ML-01..09 e 50 ciclos; smoke físico Chrome/Edge pendente                                                                    |
| SA-101b        | Desenho limitado/pausa implementados                    | Sem benchmark de CPU; não declarar ganho medido                                                                             |
| SA-102         | Fault injection e recuperação ampliadas                 | Unitários, listeners reais com adaptadores, worker/alarme em Chromium                                                       |
| SA-103         | Reconciliado e endurecido                               | `null` já rejeitado na baseline; regressão explícita e parser de storage agora robusto                                      |
| SA-104/105     | Correções de promises, compensação e copy implementadas | UI/controller testados; badge/log acessórios tratados separadamente                                                         |
| SA-106/107/108 | Dependências revisadas                                  | Instalação limpa, aprovação seletiva, audits zero na consulta executada e job de segurança                                  |
| SA-109         | E2E e CI ampliados                                      | Testes do ZIP, website, traces/screenshots de falhas e retenção 14 dias                                                     |
| SA-110         | Pendente                                                | QA-01..20 em Chrome e Edge Windows, incluindo medições físicas e restart completo                                           |
| SA-111         | Parcial                                                 | Site live responde HTTP 200; versão local revisada testada em desktop/mobile; deploy do conteúdo novo depende de integração |
| SA-112         | Parcial                                                 | ZIP/checksum e instalação automatizada conferidos; publicação estável depende de todos os gates anteriores                  |

A baseline dizia que `isCommand` aceitava `patch: null`; a inspeção do próprio commit auditado mostrou `!!candidate.patch`, portanto a alegação não se reproduzia. A leitura de preferências e sessões persistidas, por outro lado, exigia endurecimento e foi corrigida. Não foi criado um “bug reproduzido” fictício para justificar alteração.

## Quality Gate e distribuição

O gate automatizado inclui instalação limpa com lockfile e política de scripts, TypeScript também dos testes, lint, unitários, ambos os builds, manifesto, auditorias, pacote extraído e Playwright. QA Windows permanece independente. Ver [matriz manual](testing/manual-qa.md).

Tags `v1.0.0-rc.N` podem representar candidatos, mantendo `manifest.version = 1.0.0`. Não criar tag estável apenas porque CI passou. O workflow de release exige dispatch manual no tag estável, confirmação explícita de QA Windows e link público de evidência no repositório; todos os testes do pipeline ainda são executados. Este registro humano é uma declaração de homologação, não uma leitura automática de tela/suspensão.

O website deve declarar o canal beta e oferecer a coleção de releases enquanto não houver versão estável, evitando `/releases/latest` indisponível. Um ZIP de código-fonte não é o pacote instalável. Instalação e atualização são manuais via Load unpacked; não há distribuição por loja ou auto-update.

## Após a V1

Presets editáveis, duração por horário absoluto, i18n, atalhos opcionais e histórico consentido podem ser avaliados depois. Não adicionar backend, sincronização remota, processo nativo ou novas permissões para resolver os gates atuais.

## Fontes atuais de plataforma

- [Chrome Power](https://developer.chrome.com/docs/extensions/reference/api/power)
- [Chrome Alarms](https://developer.chrome.com/docs/extensions/reference/api/alarms)
- [Ciclo de vida MV3](https://developer.chrome.com/docs/extensions/develop/concepts/service-workers/lifecycle)
- [Screen Wake Lock](https://developer.mozilla.org/en-US/docs/Web/API/Screen_Wake_Lock_API)
- [APIs Edge](https://learn.microsoft.com/en-us/microsoft-edge/extensions/developer-guide/api-support)
- [Extensões no Playwright](https://playwright.dev/docs/chrome-extensions)

Consultadas em 16/10/2026 para a estabilização. Versões futuras podem alterar o comportamento; a matriz de testes deve registrar a versão efetivamente usada.
