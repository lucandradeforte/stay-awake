# Stay Awake — Documento de Direção de Produto e Engenharia

> **Status:** proposta técnica / fonte de direcionamento para implementação  
> **Versão:** 1.0 — planejamento inicial  
> **Data:** 15 de outubro de 2026  
> **Plataformas-alvo:** Google Chrome e Microsoft Edge (desktop, Windows inicialmente)  
> **Distribuição inicial:** extensão local descompactada, sem publicação em lojas  
> **Stack-base:** Manifest V3 · React · TypeScript · Vite · shadcn/ui · Tailwind CSS  
> **Escopo de uso:** computador pessoal; o uso em ambientes administrados depende das políticas e autorizações pertinentes.

---

## 0. Como utilizar este documento

Este arquivo é a **referência de produto, arquitetura, experiência, requisitos e entrega** para o desenvolvimento do Stay Awake. O agente executor deve usá-lo como insumo principal, mas **não presumir que o código já existe** ou que hipóteses experimentais estejam comprovadas. Alterações de arquitetura relevantes devem ser registradas em ADRs e vinculadas a testes.

**Legenda de situação:**

- **[DECIDIDO]** — diretriz adotada para a versão inicial.
- **[VALIDAR]** — depende de experimento e/ou verificação em ambiente real.
- **[FUTURO]** — possível evolução, fora do MVP.
- **[NÃO ESCOPO]** — explicitamente excluído.

**Ordem de autoridade:** segurança e APIs públicas dos navegadores → critérios de aceite → decisões registradas → preferências visuais → hipóteses de laboratório. Se uma solicitação de energia for recusada pelo sistema, o produto deve registrar e explicar a limitação, não mascará-la.

---

## 1. Resumo executivo

**Stay Awake** é uma extensão pessoal para navegadores Chromium que permite solicitar que a tela e/ou o sistema permaneçam ativos por um período determinado ou até desligamento manual. A operação central usa a API pública `chrome.power` e independe de manter um popup aberto.

A extensão também oferece um **Workspace** (página própria da extensão) para acompanhar a sessão, consultar diagnósticos, escolher tema e explorar uma segunda via técnica, a **Screen Wake Lock API**, válida apenas em documentos elegíveis e visíveis. Um **Developer Lab**, desativado por padrão, testa reprodução visível de vídeo HTML5 como experimento de comportamento do navegador; não substitui o mecanismo principal.

O produto terá **uma única base de código** para Chrome e Edge, com distribuição por ZIP do build e instalação manual via **Carregar sem compactação / Load unpacked**. Um website público, hospedado via **GitHub Pages**, apresentará produto, documentação, releases e tutorial de instalação; **o website não é a extensão** e não recebe permissões da API `chrome.power`.

### 1.1 Proposta de valor

- Ativação e desativação em poucos cliques.
- Temporizadores claros: predefinidos, personalizados e sem prazo.
- Distinção explícita entre **manter tela ligada** e **impedir suspensão**.
- Interface dark-first, minimalista e acessível.
- Workspace informativo e laboratório experimental isolado.
- Privacidade por padrão: sem conta, servidor ou telemetria compulsória.
- Código e distribuição reaproveitáveis entre Chrome e Edge.

### 1.2 Limite fundamental

`chrome.power` e `navigator.wakeLock` **solicitam gerenciamento de energia**, mas **não garantem que uma sessão do Windows permaneça desbloqueada** frente a políticas independentes, bloqueio manual (`Win + L`), troca de usuário, exigência de autenticação, eventos do SO ou administração corporativa. É proibido apresentar a funcionalidade como “desativar bloqueio de segurança do Windows”. Não serão implementadas emulação de mouse/teclado, interceptação de políticas nem alteração do Registro/energia do SO.

### 1.3 Métricas de sucesso propostas

1. Uma sessão de 1 hora pode ser iniciada e encerrada pelo popup sem manter popup ou Workspace abertos.
2. O vencimento do prazo libera a solicitação no navegador em testes funcionais e retorna a estado inativo.
3. Recuperação consistente após terminação do service worker, recarga da extensão e reinicialização do navegador, conforme as políticas de recuperação definidas.
4. Chrome e Edge executam o mesmo bundle com os mesmos fluxos essenciais.
5. Nenhuma permissão de leitura de sites, histórico, abas ou conteúdo da navegação é exigida para o núcleo.
6. O site público permite encontrar release, verificar versão e instalar localmente a extensão.

---

## 2. Público, contexto e problemas

### 2.1 Público primário

Pessoa usuária de PC Windows que precisa manter tela e/ou máquina acordadas durante apresentações, leitura, acompanhamento de longas tarefas, downloads, monitoramentos e execuções que não devam sofrer suspensão automática por inatividade.

### 2.2 Problemas

- Os tempos de suspensão do SO nem sempre refletem a necessidade temporária de trabalho.
- Manter um vídeo externo aberto é um workaround pouco transparente e dependente do comportamento do navegador.
- Soluções alternativas podem exigir instalação de executáveis, privilégios adicionais ou alterações globais de energia.
- É difícil distinguir uma solicitação enviada ao sistema de um resultado efetivamente observado.

### 2.3 Jobs to be done

- **Quando** inicio uma atividade longa, **quero** escolher por quanto tempo a tela ficará ativa, **para** não precisar modificar o plano de energia do Windows.
- **Quando** a atividade termina, **quero** que a ferramenta libere seu bloqueio de energia automaticamente.
- **Quando** preciso entender uma falha, **quero** consultar modo, estado, horário de expiração e limitações.
- **Quando** quero estudar o comportamento do Chrome, **quero** comparar a API de energia com Wake Lock e vídeo HTML5 em um laboratório identificado.

---

## 3. Escopo e fronteiras

### 3.1 Incluído no MVP

- Popup dark fixo, responsivo, com controle de sessão.
- Perfil `display` como padrão; `system` como opção avançada.
- Durações: 15, 30, 60, 120, 240 e 480 minutos; opção personalizada; ilimitado por escolha explícita.
- Persistência de preferências e estado desejado.
- Temporização com `chrome.alarms` e timestamp absoluto (`expiresAt`).
- Mensageria tipada entre popup, Workspace e service worker.
- Badge/ícone de status em toolbar e estado de falha visível.
- Comando inequívoco **Parar sessão**.
- Workspace próprio em aba, contendo relógio/contador, estado, ajuda e diagnósticos.
- Tema dark/light **somente no Workspace**, dark padrão; popup sempre dark.
- Painel de configuração Beta/Dev desligado por padrão.
- Página de diagnóstico de Screen Wake Lock visível.
- Laboratório experimental para vídeo HTML5 visível, com controles e encerramento explícito (pode entrar após o MVP principal).
- Build local com Chrome + Edge; README, licença escolhida pelo proprietário, instruções e releases.

### 3.2 Fora de escopo do MVP

- Conta de usuário, login ou sincronização remota.
- Backend, banco de dados ou telemetria de produto em servidor.
- Publicação em Chrome Web Store ou Edge Add-ons.
- Aplicativo nativo Windows, serviços, drivers ou agentes de sistema.
- Modificação de configurações, Registro, GPO, segurança, senha ou protetor de tela do Windows.
- Simulação de atividade humana, cliques, teclado, movimento de mouse ou manipulação de presença.
- Emulação oculta e autônoma de reprodução para forçar o desbloqueio da sessão.
- Chamada direta a `CreateVideoPowerSaveBlocker` (função interna do Chromium, não uma API JS pública).
- Forçar comportamento em Chrome fechado ou após encerramento de todas as instâncias do navegador.

### 3.3 Diretrizes de confiança

O produto informa **“solicitação de tela ativa enviada”** ou **“sessão da extensão ativa”**, e não **“Windows garantidamente desbloqueado”**. O status visual distingue estado desejado, execução da API e observação externa não disponível.

---

## 4. Fundamentos técnicos e viabilidade

### 4.1 `chrome.power` — mecanismo principal [DECIDIDO]

API pública para extensão Chromium com permissão `power`:

```ts
chrome.power.requestKeepAwake('display'); // solicita tela + sistema acordados
chrome.power.requestKeepAwake('system');  // solicita sistema acordado, permitindo apagar a tela
chrome.power.releaseKeepAwake();          // libera a solicitação da extensão
```

- `display`: solicita impedir escurecimento/desligamento do monitor e suspensão decorrentes de inatividade.
- `system`: solicita impedir suspensão por inatividade, mas permite desligar a tela.
- Chamar `requestKeepAwake` novamente pela mesma extensão substitui seu nível anterior.
- A solicitação não implica que o Windows aceite todas as consequências nem representa atividade humana.
- Não usar `chrome.power.reportActivity()` como estratégia: a documentação oficial o restringe a ChromeOS, e não é o mecanismo certo para Windows.
- **Questão a validar:** ciclo de vida da solicitação entre service worker ocioso, eventos de navegador, reload e Edge; não inferir estado nativo exclusivamente de um booleano salvo.

Fonte: https://developer.chrome.com/docs/extensions/reference/api/power

### 4.2 `navigator.wakeLock` — complementar [DECIDIDO]

```ts
const sentinel = await navigator.wakeLock.request('screen');
await sentinel.release();
```

- Requer contexto seguro e **documento visível**; apropriado para a página Workspace aberta em foreground.
- Sentinel pode ser liberado/revogado pelo navegador ou plataforma; observar `release` e `document.visibilityState`.
- Não funciona de forma persistente em service worker MV3; não pressupor que sobrevive à aba oculta.
- Deve ser opt-in no Workspace e nunca contabilizado como proteção principal quando a página estiver oculta.
- Ao retornar à visibilidade, **somente reaquisição consentida e limitada à sessão ainda ativa**.

Fontes: https://developer.mozilla.org/en-US/docs/Web/API/Screen_Wake_Lock_API e https://developer.mozilla.org/en-US/docs/Web/API/WakeLock/request

### 4.3 Reprodução de vídeo HTML5 — Developer Lab [EXPERIMENTAL]

O Chromium pode criar um bloqueador de economia de energia durante reprodução de vídeo. O componente nativo conhecido historicamente como `CreateVideoPowerSaveBlocker` pertence ao motor do navegador. **Não é exportado para JavaScript nem invocado diretamente pela extensão.**

Experimentos propostos, sempre em uma **página de laboratório visível**:

1. Reprodução de um vídeo MP4/WebM local, empacotado ou selecionado pelo usuário, com controles explícitos.
2. Experimento opcional de `canvas.captureStream()` ligado a `<video>` visível, identificando a origem gerada.
3. Comparação manual com `chrome.power` e Screen Wake Lock isolados; nunca presumir que um vídeo criado programaticamente será tratado como YouTube.
4. Mostrar `playing`, `paused`, `ended`, erro e `document.visibilityState`, com botão **Parar experimento** que pausa/descarrega o stream.

**Proibido no laboratório:** reprodução invisível/silenciosa em segundo plano destinada a falsificar presença, extensões que injetam vídeos em páginas de terceiros ou tentativas de neutralizar bloqueio de sessão configurado pelo administrador do SO.

### 4.4 Comparação resumida

| Mecanismo | Contexto | Benefício | Restrição | Categoria |
|---|---|---|---|---|
| `chrome.power('display')` | Serviço da extensão | Tela/sistema ativos sem aba | Solicitação, não garantia de desbloqueio | Core |
| `chrome.power('system')` | Serviço da extensão | Sistema acordado com tela livre para apagar | Não mantém tela ligada | Core opcional |
| `navigator.wakeLock('screen')` | Documento visível | Segunda solicitação por API Web | Liberável ao ocultar aba | Workspace |
| `<video>` HTML5 | Página visível | Teste do pipeline de mídia | Heurísticas internas não contratadas | Beta/Dev |

### 4.5 Suporte Chrome e Edge [DECIDIDO]

Edge baseado em Chromium documenta suporte às APIs de extensão `power`, `alarms` e `storage` em Manifest V3 no desktop. Portanto, **adotar build único** com feature detection e testes separados.

- Preferir `chrome.*` como API pública comum no projeto.
- Validar versões mínimas em laboratório; não congelar versões do navegador sem teste real.
- Não assumir paridade em flags experimentais ou propriedades recém-introduzidas.
- **Especialmente `chrome.alarms.persistAcrossSessions`:** propriedade recente do Chrome e não amplamente portável; não depender dela. Recriar alarmes a partir do estado persistido quando o worker acordar.
- Não usar `update_url` exclusivo de loja e nem integrar processos de aprovação de lojas neste momento.
- Chrome e Edge podem apresentar nomes e mensagens de developer mode diferentes.

Fontes: https://learn.microsoft.com/en-us/microsoft-edge/extensions/developer-guide/api-support e https://learn.microsoft.com/en-us/microsoft-edge/extensions/developer-guide/port-chrome-extension

---

## 5. Requisitos funcionais (RF)

| ID | Requisito | Prioridade | Critério objetivo de aceite |
|---|---|---|---|
| RF-01 | Iniciar sessão `display` | P0 | Clique envia pedido `power`, grava sessão e exibe estado solicitado |
| RF-02 | Encerrar sessão | P0 | Clique libera `power`, limpa alarme e persiste `inactive` |
| RF-03 | Presets de duração | P0 | 15/30/60/120/240/480 min disponíveis no popup |
| RF-04 | Duração personalizada | P1 | Entrada validada, não negativa e dentro de limite configurável |
| RF-05 | Sessão indefinida | P1 | Requer seleção explícita, badge de aviso e encerramento manual |
| RF-06 | Vencimento automático | P0 | Expiração libera solicitação assim que evento elegível é processado |
| RF-07 | Recuperação do worker | P0 | Ao acordar, compara `expiresAt` e reconstitui/remedia o estado |
| RF-08 | Estado no popup | P0 | Exibe modo, início, duração, expiração e erro quando existente |
| RF-09 | Estado no ícone/badge | P1 | Indicador ativo/inativo/atenção consistente |
| RF-10 | Página Workspace | P1 | Abre aba da extensão, compartilhando estado com popup |
| RF-11 | Tema no Workspace | P1 | Dark padrão e light opt-in persistido |
| RF-12 | Wake Lock na página | P1 | Solicitação visível com tratamento de release/erro/ocultação |
| RF-13 | Diagnóstico de sessão | P1 | Exibe dados de runtime, engine e cronologia sem PII |
| RF-14 | Ativar recursos Beta/Dev | P1 | Opt-in, descrição dos riscos, desligado por padrão |
| RF-15 | Player experimental | P2 | Mídia visível, play/pause/stop e estado mostrado |
| RF-16 | Seleção `system` | P1 | Permite conservar sistema acordado sem forçar tela ligada |
| RF-17 | Ajuda e documentação | P1 | Link para tutorial público e explicação de limitações |
| RF-18 | Instalação Chrome e Edge | P0 | Mesmo artefato `dist/` carrega em ambos navegadores |
| RF-19 | Opção de feedback | P2 | Abre página pública para registrar issue; não envia logs automaticamente |
| RF-20 | Desinstalação limpa | P0 | Nenhum processo nativo, alteração de Windows ou dado remoto remanescente |

### 5.1 Regras de duração

- Seleção de duração deve preceder ativação; padrão sugerido de **60 min**.
- Duração personalizada entre **1 min e 24 h**, validada no worker. Valores acima disso exigem modo indefinido.
- Mudança de duração durante sessão é operação explícita de **reiniciar prazo** e registra `updatedAt`.
- Alarme pontual usa **tempo absoluto** (`when: expiresAt`) e não `setTimeout` duradouro.
- Alarmes podem disparar depois do horário previsto, inclusive após suspensão; exibimos **atraso observado** e resolvemos o estado na primeira oportunidade disponível.
- Sem garantia de precisão de segundos no encerramento: a expiração operacional respeita as características do `chrome.alarms`.

### 5.2 Regras de reinicialização [DECIDIDO]

Política conservadora proposta:

- **Service worker interrompido:** sessão permanece desejada; worker reconcilia assim que for ativado; reconstitui alarme perdido.
- **Navegador fechado e reaberto:** `expiresAt` passado ⇒ inativo; `expiresAt` futuro ⇒ recuperar solicitação somente se a opção `resumeOnBrowserRestart` estiver ativa. Padrão: **desativada** (fail-safe). Sessão indefinida não retoma automaticamente sem opt-in separado.
- **Reload/atualização da extensão:** limpar estado transitório, reconciliar sem deixar badge enganoso e solicitar novamente somente quando autorizado pela preferência.
- **Erros de API:** não anunciar sucesso sem tratar erro de chamada e atualizar diagnóstico; tratar status de hardware como não verificável externamente.

### 5.3 Estados da sessão

```text
inactive ─── START ───> starting ─── SUCCESS ───> active
    ^                       │                     │
    │                       └── ERROR ───────────> error
    │                                             │
    └──── STOP / EXPIRE <──── stopping <──────────┘

active ─── worker restart ───> reconciling ───> active | inactive | error
active ─── browser quit ────> pending recovery according to preference
```

Estados exigidos: `inactive`, `starting`, `active`, `stopping`, `expired`, `reconciling`, `error`.

---

## 6. Requisitos não funcionais (RNF)

| ID | Categoria | Definição |
|---|---|---|
| RNF-01 | Privacidade | Nenhuma coleta remota de atividade ou identificador por padrão |
| RNF-02 | Segurança | Permissões mínimas: `power`, `storage`, `alarms`; extras somente com justificativa |
| RNF-03 | Compatibilidade | Smoke test obrigatório em Chrome e Edge desktop suportados |
| RNF-04 | Performance | Popup responsivo; sem polling agressivo; worker event-driven |
| RNF-05 | Acessibilidade | Teclado, foco visível, labels, contraste WCAG AA como meta |
| RNF-06 | Qualidade | TypeScript `strict`, lint, unitário, integração e E2E |
| RNF-07 | Resiliência | Estado persistido sem depender de memória volátil de service worker |
| RNF-08 | Transparência | Mostrar limitação de bloqueio e suspensão do SO de forma contextual |
| RNF-09 | Offline | Popup e Workspace operam sem rede; documentação pública pode exigir internet |
| RNF-10 | Manutenção | Arquitetura modular sem abstrações desnecessárias; dependências atualizáveis |
| RNF-11 | Consistência | Uma fonte de verdade no background; UI React não comanda SO diretamente |
| RNF-12 | Distribuição | ZIP reproduzível, versão semântica, checksum SHA-256 por release |

### 6.1 Permissões e privacidade

**Manifest base (exemplo conceitual):**

```json
{
  "manifest_version": 3,
  "name": "Stay Awake",
  "version": "0.1.0",
  "description": "Controle local de solicitações de energia da tela e sistema.",
  "permissions": ["power", "storage", "alarms"],
  "background": {
    "service_worker": "background.js",
    "type": "module"
  },
  "action": {
    "default_popup": "popup.html"
  },
  "options_page": "workspace.html"
}
```

**Observação:** caminhos e declaração exata de `options_page`/ícones serão confirmados no bundle real do Vite. A página Workspace pode ser aberta programaticamente por `chrome.runtime.getURL('workspace.html')` em uma aba, a partir de ação explícita. **Evitar permissão `tabs`** se `chrome.tabs.create` funcionar sem ela para abrir essa própria URL (validar no target). Não solicitar `<all_urls>`, `history`, `scripting`, `webRequest`, `nativeMessaging` ou host permissions sem requisito concreto.

### 6.2 Política de logs

- Eventos locais: horário, tipo, origem (`popup`/`workspace`/`background`), modo e resultado.
- Não registrar URLs visitadas, títulos de abas, texto copiado ou identidade do SO.
- Logs de erro são temporários/limitados, com opção **copiar relatório sanitizado**.
- `chrome.storage.local` mantém apenas preferências e estado; diagnóstico detalhado preferencialmente em buffer limitado.
- Excluir dados locais via configurações e ao desinstalar pelo próprio navegador.

---

## 7. Arquitetura de referência

### 7.1 Diagrama de contexto

```mermaid
flowchart TB
    U[Usuário] --> P[Popup React]
    U --> W[Workspace React]
    P <--> M[Mensageria tipada]
    W <--> M
    M <--> SW[MV3 Service Worker]
    SW --> CP[chrome.power]
    SW --> AL[chrome.alarms]
    SW <--> ST[chrome.storage.local]
    W --> WL[navigator.wakeLock]
    W --> LAB[Developer Lab de vídeo visível]
    CP --> OS[Gerenciamento de energia do SO]
    WL --> OS
    LAB --> CH[Pipeline de mídia Chromium]
    CH --> OS
    SITE[GitHub Pages público] -. documentação e releases .-> U
```

### 7.2 Fronteiras

1. **UI**: obtém dados e envia comandos; não é autoridade para gerenciamento de energia.
2. **Background/Application**: valida entrada, serializa transições, emite comandos às APIs e mantém estado desejado.
3. **Infraestrutura do navegador**: adaptadores `chrome.power`, `chrome.alarms`, `chrome.storage`.
4. **Workspace experimental**: possui ciclo de vida próprio para Wake Lock e player visível.
5. **GitHub Pages**: aplicação estática pública e independente, sem privilégios de extensão.

### 7.3 Estrutura sugerida

```text
stay-awake/
├── .github/
│   └── workflows/
│       ├── ci.yml
│       ├── release.yml
│       └── pages.yml
├── apps/
│   ├── extension/
│   │   ├── public/
│   │   │   ├── manifest.json
│   │   │   ├── icons/
│   │   │   └── media/              # somente assets locais consentidos
│   │   ├── src/
│   │   │   ├── background/
│   │   │   │   ├── index.ts
│   │   │   │   ├── session-controller.ts
│   │   │   │   ├── power-adapter.ts
│   │   │   │   └── alarm-adapter.ts
│   │   │   ├── entries/
│   │   │   │   ├── popup/
│   │   │   │   └── workspace/
│   │   │   ├── features/
│   │   │   │   ├── session/
│   │   │   │   ├── power/
│   │   │   │   ├── diagnostics/
│   │   │   │   ├── wake-lock/
│   │   │   │   ├── developer-lab/
│   │   │   │   └── settings/
│   │   │   ├── components/ui/
│   │   │   ├── lib/browser/
│   │   │   ├── styles/
│   │   │   └── types/
│   │   ├── popup.html
│   │   ├── workspace.html
│   │   ├── vite.config.ts
│   │   └── package.json
│   └── website/
│       ├── src/
│       ├── public/
│       ├── vite.config.ts
│       └── package.json
├── packages/
│   ├── contracts/                 # tipos puros e schema da sessão
│   └── design-tokens/             # tokens compartilháveis, sem importar código privilegiado
├── docs/
│   ├── architecture/
│   │   ├── ADR-001-extension-first.md
│   │   ├── ADR-002-power-engine.md
│   │   ├── ADR-003-cross-browser.md
│   │   └── ADR-004-hosting-distribution.md
│   ├── product/
│   ├── design/
│   ├── testing/
│   └── release/
├── tests/
│   ├── unit/
│   ├── integration/
│   └── e2e/
├── package.json
├── pnpm-workspace.yaml
├── README.md
├── CHANGELOG.md
└── LICENSE
```

**Justificativa do monorepo leve:** reusar tokens visuais e contratos entre extensão e site, sem forçar Next.js nem backend. Para um protótipo minúsculo seria aceitável um repositório plano; esta estrutura é a recomendação para a trajetória V1 + website público. Evitar circularidade entre `apps` e `packages`.

### 7.4 Stack definitiva proposta

| Área | Tecnologia | Motivo |
|---|---|---|
| Linguagem | TypeScript strict | Contratos fortes e manutenção |
| Extensão | Manifest V3 | Plataforma atual Chromium |
| UI | React | Componentização e estado declarativo |
| Bundler | Vite com entradas múltiplas configuradas | Build local eficiente |
| CSS | Tailwind CSS | Tokens, utilitários e dark-first |
| Componentes | shadcn/ui + Radix primitives | Acessibilidade e customização |
| Ícones | Remix Icon | Identidade consistente |
| Estado transitório | React hooks / Zustand somente quando necessário | Sem estado duplicado autoritativo |
| Estado durável | chrome.storage.local | Disponível ao background e interfaces |
| Agendamento | chrome.alarms | Sobrevive à dormência do worker via eventos; reconciliação necessária |
| Core energia | chrome.power | API pública documentada |
| API Web complementar | navigator.wakeLock | Experimento visível |
| Validação de mensagens | Zod ou parser equivalente | Dados e comandos validados em runtime |
| Unitário | Vitest | Testes determinísticos |
| E2E | Playwright + cenários manuais de extensão | Automação em Chromium; Edge requer validação real |
| Docs web | Vite + React (estático) | GitHub Pages sem SSR/backend |
| CI | GitHub Actions | Lint, testes, build, release e Pages |
| Package manager | pnpm | Workspace eficiente |

### 7.5 Contratos de domínio

**Modelo conceitual, sujeito a refinamento:**

```ts
type KeepAwakeLevel = 'display' | 'system';
type SessionStatus =
  | 'inactive' | 'starting' | 'active' | 'stopping'
  | 'expired' | 'reconciling' | 'error';

type StayAwakeSession = {
  schemaVersion: 1;
  id: string;
  status: SessionStatus;
  level: KeepAwakeLevel;
  durationMinutes: number | null; // null = indefinido
  startedAt: number | null;
  expiresAt: number | null;
  updatedAt: number;
  lastError?: { code: string; message: string; at: number };
};

type Preferences = {
  defaultDurationMinutes: number;
  defaultLevel: KeepAwakeLevel;
  workspaceTheme: 'dark' | 'light';
  developerModeEnabled: boolean;
  resumeOnBrowserRestart: boolean;
  resumeUnlimitedOnRestart: boolean;
};

type SessionCommand =
  | { type: 'SESSION_START'; level: KeepAwakeLevel; durationMinutes: number | null }
  | { type: 'SESSION_STOP' }
  | { type: 'SESSION_GET' }
  | { type: 'SESSION_UPDATE_DURATION'; durationMinutes: number | null };
```

- `id` impede confusão com alarms pertencentes a sessões anteriores.
- Timestamps são milissegundos UNIX; tempos exibidos no timezone local.
- Não confiar em dados de mensagens sem validação; evitar corridas Start/Stop e expirations antigas.
- Guardar `expiresAt`, não apenas “faltam 60 min”.
- Escrever estado `starting` antes da ativação e confirmar `active` depois; erros levam a `error` e tentativa controlada de liberação.

### 7.6 Fluxo START

```mermaid
sequenceDiagram
    participant UI as Popup/Workspace
    participant SW as Session Controller
    participant Store as chrome.storage
    participant Power as chrome.power
    participant Alarm as chrome.alarms
    UI->>SW: SESSION_START(duration, level)
    SW->>SW: validar e serializar comando
    SW->>Store: salvar starting + expiresAt
    SW->>Power: requestKeepAwake(level)
    SW->>Alarm: criar alarm de expiração (se finito)
    SW->>Store: salvar active
    SW-->>UI: snapshot da sessão
```

### 7.7 Fluxo STOP/EXPIRATION

```mermaid
sequenceDiagram
    participant E as UI ou onAlarm
    participant SW as Session Controller
    participant Power as chrome.power
    participant Alarm as chrome.alarms
    participant Store as chrome.storage
    E->>SW: STOP ou EXPIRATION(id)
    SW->>SW: verificar sessão atual/id/tempo
    SW->>Store: salvar stopping
    SW->>Power: releaseKeepAwake()
    SW->>Alarm: limpar alarm
    SW->>Store: salvar inactive/expired
    SW-->>E: status final
```

### 7.8 Recuperação após worker ocioso

O service worker MV3 é **event-driven** e pode ser encerrado por inatividade. Proibição de pressupor um processo em memória permanentemente ativo. Reconciliar em `onStartup`, `onInstalled`, `onAlarm` e quando necessário ao receber mensagens/abrir popup.

**Política de reconciliação:**

1. Carregar snapshot local e versão do schema.
2. Identificar se sessão foi interrompida, expirada, abandonada ou requer retomar conforme preferência.
3. Se `expiresAt <= now`, liberar solicitação se necessário, limpar alarm e marcar expirada.
4. Se válida e autorizada, reemitir `requestKeepAwake(level)` de forma idempotente e garantir existência de alarme.
5. Se não autorizada a retomada (reinício completo), liberar e marcar inativa.
6. Reconciliar indicador do popup/toolbar; nunca rotular como hardware garantidamente acordado.

**Risco técnico a validar em POC:** diferenciar o evento `onStartup` de mero despertar do worker e os efeitos de recarregar/desativar a extensão. É possível que a API nativa preserve ou libere sua solicitação em eventos diferentes. Criar testes específicos para isso antes de finalizar comportamento do modo ilimitado.

---

## 8. UX, navegação e interfaces

### 8.1 Princípios de design [DECIDIDO]

Referências conceituais: [Vercel](https://vercel.com/), [Next.js](https://nextjs.org/), [shadcn/ui](https://ui.shadcn.com/), [GitHub](https://github.com/). **Inspirar-se em clareza e composição, não copiar marca, ícones proprietários ou layouts integralmente.**

1. Minimalismo funcional: informação suficiente, sem painéis supérfluos.
2. Dark-first confortável: grafite em vez de preto absoluto como única superfície.
3. Estados sem ambiguidade: cor + texto + ícone (nunca só cor).
4. Hierarquia enxuta: nome, estado, duração, ação principal e detalhes.
5. Botões grandes, foco visível e microinterações contidas.
6. Movimento reduzido com `prefers-reduced-motion`; nada de efeitos contínuos que aumentem carga de CPU.
7. Idioma inicial: português-BR; conteúdo preparado para i18n futuro.

### 8.2 Identidade visual

**Nome:** Stay Awake (provisório, verificar disponibilidade de marca e conflitos antes de publicação ampla).

**Personalidade:** utilitário confiável, discreto, tecnológico, claro. Não usar linguagem que implique hack, bypass ou desbloqueio de segurança.

**Paleta — dark (sugestão):**

| Token | Hex | Uso |
|---|---|---|
| `--bg` | `#0B0D10` | Fundo principal |
| `--surface` | `#111419` | Cartões e painel |
| `--surface-elevated` | `#1A1F26` | Popovers, hover |
| `--border` | `#292F38` | Divisores, inputs |
| `--text` | `#E7EAF0` | Texto principal |
| `--text-muted` | `#9AA4B2` | Textos secundários |
| `--accent` | `#8FDCB1` | Ativo/sucesso/acento |
| `--accent-dark` | `#244A37` | Fundo de botão ativo |
| `--warning` | `#E7C479` | Beta, energia, risco |
| `--error` | `#EF8E8E` | Falha |

**Paleta — light (apenas Workspace):**

| Token | Hex |
|---|---|
| `--bg` | `#F7F8FA` |
| `--surface` | `#FFFFFF` |
| `--border` | `#DFE3E8` |
| `--text` | `#171B20` |
| `--text-muted` | `#5F6875` |
| `--accent` | `#276749` |

**Tipografia:** `Geist` caso sua licença de distribuição esteja compatível com a build; fallback `Inter`, `Segoe UI`, `system-ui`, `sans-serif`; números tabulares no cronômetro. Fontes devem ser empacotadas localmente na extensão; não depender de CDN.

**Grid/forma:** spacing 4px base; radius 8–12px para cards, 999px para chips; bordas finas; sombra mínima; transições 120–180ms quando não houver preferência por movimento reduzido.

### 8.3 Mapa de telas

```text
Extensão
├── Popup (sempre dark)
│   ├── Home / Sessão
│   ├── Duração e modo
│   ├── Ações Start / Stop
│   └── Acesso ao Workspace
└── Workspace (dark padrão / light opcional)
    ├── Overview / Sessão de espera
    ├── Diagnostics
    ├── Developer Lab [Beta/Dev, opt-in]
    ├── Settings
    └── Help & About

Website GitHub Pages (público)
├── Landing
├── Features
├── Installation (Chrome e Edge)
├── FAQ e Troubleshooting
├── Changelog
└── Links para GitHub Releases e Issues
```

### 8.4 Popup — especificação

**Dimensões sugeridas:** 360–400px largura; altura compacta sem rolagem no caso básico.

Ordem visual:

1. Header: ícone, Stay Awake, Settings.
2. Status hero: OFF/ACTIVE/PENDING/ERROR com botão de energia grande.
3. Escolha de duração: 15, 30, 60, 120 min, custom, unlimited; 4/8 h em grupo avançado ou segunda linha.
4. Modo de energia: `display` padrão; `system` em disclosure de opções avançadas.
5. Detalhes: engine, horário de expiração, tempo restante.
6. CTA Start/Stop; rodapé: **Abrir Workspace**, versão.

**Labels:** “Manter tela ligada”, “Somente impedir suspensão”, “Até eu desativar”, “Parar sessão”, “Solicitação ativa”. Evitar “desbloqueado garantido”.

**Comportamentos:** botão desabilitado durante `starting/stopping`; confirmar mudança de modo em sessão ativa; erros com retry; atualização por mensagem e `chrome.storage.onChanged`, sem múltiplas sources of truth.

### 8.5 Workspace — especificação

Header enxuto, navegação por tabs (Sessão, Diagnósticos, Laboratório [condicional], Configurações), botão de alternância dark/light, versão.

**Overview:**

- Título “Seu espaço, sem interrupções desnecessárias”.
- Status de engine e timer destacado.
- Relógio local opcional e contador com tabular numerals.
- Cartão informativo sobre o que a extensão controla.
- Botões Parar / Reiniciar prazo / Abrir diagnósticos.
- Modo apresentação (distrações reduzidas) opcional.

**Diagnósticos:**

- Versão da extensão, navegador (sem fingerprinting persistente), modo atual, horários e último erro.
- Estado do sentinel de Wake Lock **somente quando medido naquele documento**.
- Sinalizar “status do Windows não verificável pela extensão”.
- Copiar diagnóstico sanitizado.
- Checks guiados para testar comportamento de tela e suspensão sem inferir evento que a API não expõe.

**Developer Lab:**

- Entrar somente com toggle Beta/Dev ligado e aviso de natureza experimental.
- Escolha manual de engine para teste de API Web vs vídeo visível.
- Controles play/pause/stop e limpeza garantida de objetos/streams ao sair.
- Indicadores de `document.visibilityState`, eventos de mídia e status Wake Lock.
- Nunca rodar em aba escondida para reproduzir presença nem afirmar bloqueio de segurança desativado.

**Settings:** tema Workspace; presets preferidos; defaults; comportamento de retomada; toggle Beta/Dev; avisos de energia; apagar dados locais; documentação.

### 8.6 Microcopy e feedback

- Sessão inativa: “Pronto para iniciar.”
- Sessão ativa: “Solicitação de energia ativa.”
- Modo display: “Solicitando que tela e sistema permaneçam acordados.”
- Modo system: “Solicitando evitar suspensão; a tela pode apagar.”
- Sem prazo: “Ativo até você desativar. Pode aumentar consumo de bateria.”
- Wake Lock liberado: “A página deixou de estar elegível para manter a tela ativa.”
- Falha: “Não foi possível confirmar a solicitação. Consulte diagnósticos.”
- Limite: “Regras de bloqueio do Windows podem prevalecer.”

### 8.7 Acessibilidade e responsividade

- Teclado: navegação sequencial, Enter/Espaço, Esc quando aplicável.
- Contraste mínimo AA para texto comum; testar combinações de verde e cinza.
- `aria-live` apenas em mudanças importantes (não anunciar cronômetro a cada segundo).
- Estados de foco evidentes, alvos 40–44px como referência prática.
- Workspace responsivo de 320px ao desktop; popup testado em escala de SO 100/125/150%.
- Suporte a zoom e movimento reduzido; não depender exclusivamente de hover.

---

## 9. Guia de testes e validação

### 9.1 Matriz de experimentos de energia

| Teste | Chrome Power | Workspace visível | Screen Wake Lock | Vídeo visível | Resultado esperado |
|---|---:|---:|---:|---:|---|
| A — baseline | Não | Não | Não | Não | Registrar comportamento normal de referência |
| B — core | `display` | Não | Não | Não | Solicitação fica ativa sem popup |
| C — Workspace | `display` | Sim | Sim | Não | Duas solicitações elegíveis, sem garantia adicional |
| D — Web Wake Lock | Não | Sim | Sim | Não | Somente enquanto a página estiver visível |
| E — mídia | Não | Sim | Não | Sim | Verificar comportamento da reprodução real |
| F — comparativo | `display` | Sim | Sim | Sim | Comparar; não pressupor efeito cumulativo |

**Obrigatório:** executar cada experimento com mesma alimentação (tomada/bateria), timeout base conhecido, mesmas configurações e mesma versão do navegador. Observar separadamente (1) monitor, (2) suspensão, (3) bloqueio de sessão. Registar apenas os comportamentos visíveis e eventos de API; não afirmar precisão sobre o estado interno do SO.

### 9.2 Planilha de evidências (modelo)

| Campo | Exemplo de preenchimento |
|---|---|
| Browser | Chrome / Edge + versão |
| Sistema | Windows 11 + versão |
| Alimentação | Tomada / Bateria |
| Experimento | B — Core |
| Hora de início | ISO local |
| Duração | 30 min |
| Popup fechado? | Sim/Não |
| Workspace visível? | Sim/Não |
| Tela apagou? | Sim/Não/Não determinado |
| Sistema suspendeu? | Sim/Não/Não determinado |
| Sessão bloqueou? | Sim/Não/Não determinado |
| Evento de API / erro | Detalhe técnico sanitizado |
| Resultado | PASS / FAIL / INCONCLUSIVE |

### 9.3 Unit tests (Vitest)

- Máquina de estados: `start`, `stop`, `expire`, `error`, `recover`.
- Durações inválidas, enormes, fracionadas e de fronteira.
- Alarme de sessão antiga não pode encerrar sessão nova.
- `expiresAt` ultrapassado durante worker ocioso.
- Falha em `requestKeepAwake`, `releaseKeepAwake`, storage e alarm.
- Migração de schema e fallback de storage ausente/corrompido.
- Transições concorrentes (double click, popup+workspace simultâneos).
- Sanitização de erros e diagnósticos.

### 9.4 Integração e E2E

- Carregar build MV3 sem erro em Chrome e Edge.
- Abrir popup, iniciar/parar, recarregar extensão e reabrir popup.
- Terminar/reiniciar service worker; verificar estado após reconciliar.
- Fazer o alarm expirar com popup fechado.
- Testar comportamento após fechar e reabrir navegador com retomar desativado e ativado.
- Workspace acompanha alterações da sessão feitas no popup.
- Wake Lock é liberado em `visibilitychange` e `release` (quando aplicável).
- Developer Lab limpa vídeo/streams ao encerrar ou navegar para outra seção.
- Capturar screenshots dark e light e checar regressões visuais.
- E2E automatizado de extensão pode exigir contexto Chromium persistente. **Edge real precisa de smoke test manual além de possível automação.**

### 9.5 Critérios para liberar V1

- [ ] Chrome e Edge carregam a mesma build com Manifest V3 válido.
- [ ] `display` e `system` acionados/liberados conforme modo.
- [ ] Nenhum timer depende de `setInterval` permanente no worker.
- [ ] `expiresAt` e recuperação de alarm testados.
- [ ] Popup funciona fechado entre Start e Stop.
- [ ] Workspace sincronizado e tem dark/light funcional.
- [ ] Todas as ações essenciais utilizáveis por teclado.
- [ ] Beta/Dev isolado, desligado por padrão e com aviso.
- [ ] Docs/release/ZIP têm versão e checksum corretos.
- [ ] README informa explicitamente os limites de bloqueio do SO.
- [ ] Nenhuma permissão além do necessário foi introduzida.

---

## 10. Segurança, riscos e mitigação

| ID | Risco | Impacto | Mitigação |
|---|---|---|---|
| R-01 | Tela fica ligada indefinidamente | Energia/bateria/OLED | Warning e botão Stop persistentes; modo ilimitado explícito |
| R-02 | Bloqueio do Windows ainda ocorre | Expectativa inadequada | Comunicação clara e testes separados |
| R-03 | Worker MV3 é interrompido | Estado inconsistente | Persistência + alarms + reconciliação |
| R-04 | Alarme não persiste entre sessões | Prazo inadequado | Recriar a partir de `expiresAt`; checar na inicialização |
| R-05 | Wake Lock revogado ao ocultar página | Falha do complemento | Eventos `release` + fallback principal; aviso |
| R-06 | Paridade Chrome/Edge incompleta | Bugs | Testes reais; feature detection |
| R-07 | Reproduzir vídeo gasta recursos | CPU/GPU/energia | Lab manual, visível, opt-in e com Stop/cleanup |
| R-08 | Build ZIP adulterado | Cadeia de suprimento | SHA-256, releases versionados, origem oficial |
| R-09 | Dependências externas/CSP MV3 | Extensão não carrega | Assets e scripts locais; auditoria de build |
| R-10 | Usuário confunde Pages com extensão | Instalação frustrada | Documentar que site não controla `chrome.power` |
| R-11 | Administração bloqueia sideload | Sem instalação | Respeitar política; uso pessoal e autorização onde aplicável |
| R-12 | Extensão muda política por acidente | Segurança | Sem Registro, comandos do Windows ou native messaging |

**Threat model resumido:** a extensão tem poder de solicitar alteração temporária de gerenciamento de energia; esse privilégio não deve ser ampliado para ler sites, controlar input, coletar dados ou executar código remoto. Evitar HTML arbitrário, dependências suspeitas e assets remotos executáveis. Respeitar CSP de Manifest V3.

---

## 11. Roadmap e milestones

O roadmap é organizado por **critérios de saída**, e não por estimativas de dias.

### Fase 0 — Discovery / POC de compatibilidade (P0)

**Objetivo:** provar a base técnica nos dois navegadores.

- Criar extensão mínima MV3 com `power`, `storage`, `alarms`.
- Build inicial via Vite.
- Testar `requestKeepAwake('display')` e `releaseKeepAwake` no Chrome e Edge.
- Testar worker ocioso, reload e browser restart.
- Registrar matriz de resultados e escolher estratégia de recuperação.

**Saída:** POC instalada localmente em ambos browsers + relatório `docs/testing/poc-energy.md`.

### Fase 1 — V0.1 Core / Popup (P0)

- SessionController e adaptadores de API.
- Presets de duração, Start/Stop, estados, timer e alarme.
- Persistência, reconciliação, aviso modo ilimitado.
- Popup dark-first e status na toolbar.
- Testes unitários + lint/typecheck/build.

**Saída:** extensão usável sem abrir Workspace.

### Fase 2 — V0.2 Workspace (P1)

- Página interna da extensão.
- Session Overview; relógio e contadores.
- Light/dark no Workspace; dark no popup.
- Introduzir `navigator.wakeLock` com ciclo de vida correto.
- Diagnostics e erro/telemetria local sanitizada.

**Saída:** UI consistente e sessão sincronizada em múltiplas views.

### Fase 3 — V0.3 Developer Lab (P2)

- Ativação Beta/Dev opt-in.
- Experimento de vídeo HTML5 visível e controlado.
- Comparativo manual de engines e registro dos resultados.
- Documentar diferenças entre vídeo, Wake Lock e Power.

**Saída:** laboratório isolado, sem alterar segurança do SO.

### Fase 4 — V0.4 Site e distribuição (P1)

- Landing/Docs/FAQ/Tutorial no GitHub Pages.
- GitHub Actions para CI e Pages.
- Pipeline de ZIP release e SHA-256.
- Tutoriais Chrome/Edge + screenshots.

**Saída:** release instalável localmente a partir do repositório.

### Fase 5 — V1.0 Quality Gate (P0)

- Matriz Chrome/Edge concluída.
- QA funcional e visual; acessibilidade.
- Regressão, política de logs e revisão de permissões.
- Release sem bugs bloqueantes, changelog, tag e checksum.

**Saída:** V1.0 estável para uso pessoal.

### Backlog futuro (sem compromisso)

- Presets por contexto (`Leitura`, `Apresentação`, `Processamento`).
- Horário absoluto (“manter até 18h”).
- Histórico **local** de sessões, com retenção curta e opt-in.
- Internacionalização pt-BR/en-US.
- Atalhos configuráveis via `commands` se justificado.
- Import/export de preferências não sensíveis.
- Automatização de releases assinadas, quando fizer sentido.
- Avaliar publicação nas lojas apenas após maturidade e revisão de políticas.

---

## 12. Repositório, hospedagem, domínio e distribuição

### 12.1 Recomendação de repositório [DECIDIDO]

Criar repositório pessoal independente, por exemplo:

- GitHub: `https://github.com/lucandradeforte/stay-awake` *(nome/caminho proposto; não implica que o repositório já exista).* 
- Branch padrão: `main`.
- Desenvolvimento em branches `feat/*`, `fix/*`, `docs/*`.
- Tags `v0.1.0`, `v0.2.0`, ...
- Commits convencionais recomendados (`feat:`, `fix:`, `docs:`, `chore:`).
- Licença: escolher explicitamente (MIT é opção, não presumir antes de aprovação).

Evitar associar a ferramenta ao repositório corporativo Nexus. Não incluir nenhuma referência interna de organização, políticas ou identificadores da máquina corporativa.

### 12.2 GitHub Pages — o que pode ser hospedado

**Pode:** landing page, documentação de instalação, FAQ, changelog, screenshots, links para release, formulário de feedback via GitHub Issues, versão de demonstração visual e explicações das APIs.

**Não pode:** executar `chrome.power` diretamente do domínio `github.io`; hospedar a extensão como se uma pessoa pudesse “instalar” seu conjunto de permissões apenas visitando o site; distribuir atualização automática de extensão descompactada como se fosse uma loja.

**Estratégia recomendada:**

```text
GitHub Repo: lucandradeforte/stay-awake
├── Código-fonte / apps/extension
├── apps/website ── GitHub Actions ──> GitHub Pages
└── GitHub Releases ── stay-awake-vX.Y.Z-unpacked.zip

Website: https://lucandradeforte.github.io/stay-awake/
(rota proposta, dependente de criação e ativação do Pages)
```

Alternativa se o usuário possuir repositório `lucandradeforte.github.io`: colocar a landing sob rota ou link próprio, mantendo o código da extensão no repositório `stay-awake`. Evitar acoplar build de extensão ao website principal sem necessidade.

### 12.3 Tutorial: ativar GitHub Pages

1. Criar o repositório `stay-awake` no GitHub.
2. Subir o código e uma aplicação estática em `apps/website`.
3. Em `apps/website/vite.config.ts`, configurar `base: '/stay-awake/'` para o endereço de **project Pages**; se publicar no domínio raiz `username.github.io` ou domínio personalizado na raiz, usar `base: '/'`.
4. Criar `.github/workflows/pages.yml` com etapas `checkout`, setup Node/pnpm, instalar com lockfile, executar build do website, `actions/upload-pages-artifact` e `actions/deploy-pages`.
5. Nas configurações do repositório: **Settings → Pages → Build and deployment → Source: GitHub Actions**.
6. Conceder no workflow permissões `contents: read`, `pages: write` e `id-token: write` e selecionar ambiente `github-pages` no job de deploy.
7. Fazer push em `main`; acompanhar workflow **Actions**.
8. Abrir a URL publicada e testar URLs internas em refresh (para SPA, preferir páginas estáticas geradas ou fallback compatível com GitHub Pages).
9. Publicar links de releases e tutorial; nunca incluir segredos ou dados privados nos assets do Pages.

**Pipeline conceitual (ajustar comandos ao monorepo implementado):**

```yaml
name: Deploy website
on:
  push:
    branches: [main]
    paths:
      - 'apps/website/**'
      - 'packages/design-tokens/**'
      - '.github/workflows/pages.yml'
  workflow_dispatch:
permissions:
  contents: read
  pages: write
  id-token: write
concurrency:
  group: github-pages
  cancel-in-progress: true
jobs:
  deploy:
    runs-on: ubuntu-latest
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '24'
      - uses: pnpm/action-setup@v4
        with:
          version: 10
      - run: pnpm install --frozen-lockfile
      - run: pnpm --filter website build
      - uses: actions/configure-pages@v5
      - uses: actions/upload-pages-artifact@v3
        with:
          path: apps/website/dist
      - id: deployment
        uses: actions/deploy-pages@v4
```

> **Nota de implementação:** YAML é ilustrativo e depende do nome real do pacote `website`, configuração pnpm e compatibilidade das versões de actions no momento da execução; fixar versões/SHAs revisados, revisar permissões e testar no repositório antes de adotá-lo. O projeto pode usar também workflows separados para release do ZIP.

Fontes: https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site e https://vite.dev/guide/static-deploy.html

### 12.4 Publicação de releases sem loja

**Artefato recomendado:** `stay-awake-v1.0.0-unpacked.zip`, cujo conteúdo, ao extrair, será a **pasta compilada da extensão** com `manifest.json` na raiz da pasta selecionada pelo navegador. Separar o build do website: `apps/website/dist` **não** é extensão.

1. Build determinístico da extensão: `pnpm --filter extension build` (ajustar conforme package names).
2. Validar presença de `manifest.json`, popup, workspace, service worker e assets.
3. Criar `stay-awake-vX.Y.Z-unpacked.zip` contendo somente a extensão compilada, preservando estrutura de diretórios.
4. Gerar SHA-256 do ZIP e publicar o valor no release.
5. Criar tag `vX.Y.Z`, incluir changelog e anexar ZIP em **GitHub Releases**.
6. Website aponta para página do release (não inventar link de arquivo antes de publicar).
7. As atualizações de uma extensão carregada sem compactação são **manuais**: obter novo ZIP, extrair em local estável e clicar **Recarregar/Reload** no gerenciador, ou reinstalar se necessário.

**Importante sobre atualizações:** não há mecanismo de update via GitHub Pages equivalente à loja para instalações locais descompactadas. Nunca prometer atualização silenciosa ou automática.

### 12.5 Instalação local — Google Chrome

**Pré-requisito:** desktop com Chrome atualizado e permissão para usar extensões locais.

1. Acessar o GitHub Release correspondente e baixar o `stay-awake-vX.Y.Z-unpacked.zip`.
2. Conferir SHA-256 publicado (recomendado) e extrair o ZIP para pasta persistente, por exemplo `C:\Tools\StayAwake\extension\`. **Não escolher o ZIP; escolher a pasta extraída.**
3. Verificar que existe `manifest.json` na pasta selecionada, por exemplo `C:\Tools\StayAwake\extension\manifest.json`.
4. Abrir `chrome://extensions` na barra de endereço.
5. Ativar **Modo do desenvolvedor / Developer mode**.
6. Selecionar **Carregar sem compactação / Load unpacked**.
7. Apontar para a pasta onde está `manifest.json`.
8. Confirmar que **Stay Awake** foi carregado sem erros.
9. No menu de extensões (ícone de peça de quebra-cabeça), fixar Stay Awake na barra de ferramentas.
10. Abrir popup, escolher 15 minutos, iniciar e validar o estado; depois desativar manualmente.
11. Abrir **Workspace** para testar modo claro/escuro e diagnóstico.
12. Para desenvolvimento, após reconstruir os arquivos, retornar a `chrome://extensions` e clicar **Recarregar**. Se o popup estiver aberto, fechá-lo e reabri-lo.

**Se falhar:** conferir se o ZIP foi extraído; pasta correta; manifesto válido; caminho do worker; CSS/JS realmente incluídos no build; avisos/erros em `chrome://extensions`.

Fonte: https://developer.chrome.com/docs/extensions/get-started/tutorial/hello-world

### 12.6 Instalação local — Microsoft Edge

**Pré-requisito:** Edge desktop atualizado e permissão para instalar extensões locais.

1. Baixar o mesmo ZIP de release e extrair numa pasta permanente, como `C:\Tools\StayAwake\extension\` (pasta separada para testes, se necessário).
2. Abrir `edge://extensions`.
3. Habilitar **Modo de desenvolvedor / Developer mode**.
4. Selecionar **Carregar sem compactação / Load unpacked**.
5. Escolher a pasta que contém `manifest.json`.
6. Conferir instalação e permissões exibidas.
7. Fixar o ícone da extensão na barra de ferramentas.
8. Testar Start/Stop, duração, abertura de Workspace e comportamento `display`.
9. Para atualizar, substituir os arquivos compilados na pasta local e clicar **Recarregar / Reload** no card da extensão.
10. Se uma API tiver diferença no Edge, documentar e corrigir por feature detection/adapter sem criar forks arbitrários do core.

A Microsoft documenta sideload de extensões descompactadas e suporte de Edge Chromium a `power`, `alarms` e `storage` para MV3 desktop.

Fontes: https://learn.microsoft.com/en-us/microsoft-edge/extensions/getting-started/extension-sideloading e https://learn.microsoft.com/en-us/microsoft-edge/extensions/developer-guide/api-support

### 12.7 Uso local a partir do desenvolvimento (sem GitHub Release)

1. Clonar o repositório local.
2. Instalar Node LTS/versão definida no `package.json` e pnpm.
3. `pnpm install`.
4. `pnpm --filter extension build` (nome final do pacote a confirmar).
5. Identificar pasta de saída da extensão, ex.: `apps/extension/dist`.
6. Chrome/Edge: Developer mode → Load unpacked → escolher **`apps/extension/dist`**.
7. Após modificar fonte, gerar novo build e acionar Reload no gerenciador.

**Não usar** URL do dev server Vite como `default_popup` para versão de distribuição. A build MV3 deve conter JavaScript, CSS e fontes localmente, respeitando Content Security Policy.

### 12.8 Troubleshooting mais frequente

| Sintoma | Causa provável | Ação |
|---|---|---|
| “Manifest missing / unreadable” | Pasta errada / ZIP não extraído | Selecionar diretório com `manifest.json` |
| Popup abre em branco | Caminhos/JS/CSP | Inspecionar popup e arquivos da build |
| Erro do service worker | Bundle não emitido ou import inválido | Ver painel de erros em `chrome://extensions`/`edge://extensions` |
| Workspace não abre | Caminho `workspace.html` incorreto | Validar `runtime.getURL` e build |
| Wake Lock rejeitado | Página oculta/restrição de plataforma | Mostrar erro e estado; não forçar |
| O Windows bloqueia | Política de segurança independente | Informar limitação; não contornar bloqueio |
| Expiração atrasada | Worker/browser dormiu ou alarme disparou tarde | Reconciliar por timestamp e exibir atraso |
| Edge não carrega | API incompatível/manifesto/CSP | Ver suporte Microsoft e reproduzir falha no Edge |
| Instalação desabilitada | Política do navegador/administrador | Utilizar somente em equipamento permitido |
| Perda de dados após reinstalação | ID/perfil da extensão alterado | Documentar backup de preferências; não prometer estabilidade do ID |

---

## 13. Estratégia de engenharia e workflow de agentes

### 13.1 Ordem de execução sugerida

1. **Discovery:** validar APIs e hipótese MV3 em dois navegadores.
2. **Planejamento de execução:** decompor em histórias técnicas com critério de aceite e evidência.
3. **Implementação vertical:** Start → persistência → Stop → expiração → UI → recuperação.
4. **Auditoria independente:** segurança, estado, API, UX, build e testes.
5. **Documentação e release:** ZIP, checksum, site e tutoriais.

### 13.2 Definition of Ready (DoR)

Uma história pode iniciar se contiver:

- Cenário concreto, usuário e benefício.
- Comportamento esperado e o que não deve fazer.
- Interfaces/tipos afetados.
- Critérios de aceite e estratégia de teste.
- Risco/feature flag quando experimental.

### 13.3 Definition of Done (DoD)

- Typecheck + lint + unitários passando.
- Testes e cenários manuais documentados.
- Build MV3 carregável em Chrome e Edge para histórias de runtime.
- Não introduziu permissões desnecessárias nem scripts remotos.
- Estados e erros documentados.
- Screenshot/QA visual de alterações na UI.
- Changelog atualizado quando há mudança observável.
- Evidência da verificação anexada ao PR/relatório.

### 13.4 Backlog inicial em épicos

| Épico | Histórias prioritárias | Dependência |
|---|---|---|
| EP-01 Bootstrap | Monorepo, Vite multi-entry, manifesto, types, CI | Nenhuma |
| EP-02 Power Core | Adapter API, Session Controller, Start/Stop | EP-01 |
| EP-03 Persistência | Storage, alarms, recovery, migrations | EP-02 |
| EP-04 Popup | Design tokens, seleção, status, ação | EP-02/03 |
| EP-05 Workspace | Overview, Settings, sincronização | EP-03/04 |
| EP-06 Wake Lock | Sentinel, lifecycle, diagnostics | EP-05 |
| EP-07 Dev Lab | Player HTML5 visível, logs e limpeza | EP-05 |
| EP-08 Website/Docs | Landing, tutorial, FAQ, Pages | EP-01 |
| EP-09 Release/QA | Pipeline ZIP, SHA-256, regressão browser | EP-02 a 08 |

### 13.5 Decisões arquiteturais (ADR)

**ADR-001 — Extensão, não app Windows:** menos instalação, sem alterar configurações do Windows, responde ao objetivo do MVP.

**ADR-002 — `chrome.power` como engine core:** API pública específica, não exige reprodução de vídeo. `Screen Wake Lock` é complementar e limitado à visibilidade.

**ADR-003 — Mesmo build Chrome/Edge:** compatibilidade oficial suficiente; adaptadores e testes para exceções.

**ADR-004 — Website separado da extensão:** Pages é apresentação/documentação; apenas a extensão empacotada acessa APIs privilegiadas.

**ADR-005 — Worker event-driven:** storage+alarms, sem keepalive artificial ou estado em memória como fonte de verdade.

**ADR-006 — Lab opt-in e visível:** mídia é investigação, não meio principal, nem tentativa de mascarar atividade do usuário.

**ADR-007 — Segurança do SO respeitada:** não alterar configurações de proteção nem prometer ignorar bloqueios.

**ADR-008 — Distribuição por ZIP/release:** sem lojas no início; atualização manual documentada.

---

## 14. Indicadores de produto e qualidade

Sem telemetria remota, acompanhar **manualmente ou localmente e opcionalmente**:

- Sucesso de Start/Stop em cada browser.
- Falhas de recuperação após worker/restart.
- Alarmes expirados e latência de reconciliação.
- Resultados da matriz real de tela/suspensão/bloqueio (observados pelo usuário).
- Tamanho do bundle por entrada.
- Cobertura relevante de lógica de sessão (prioridade na cobertura de caminhos críticos, não porcentagem isolada).
- Contraste, navegação por teclado e ausência de falhas visuais.
- Erros de instalação relatados em Issues públicas (sem informações privadas).

**Não adicionar analytics automático** ao popup, worker ou Workspace na V1.

---

## 15. Aceite final de produto

A V1 estará pronta quando um usuário puder:

1. Acessar a página pública do Stay Awake hospedada no GitHub Pages.
2. Seguir instruções para baixar um release ZIP e verificar sua integridade.
3. Extrair e carregar **o mesmo artefato** no Chrome ou Edge em modo desenvolvedor.
4. Iniciar sessão por duração limitada sem manter popup aberto.
5. Consultar prazo e encerrá-la manualmente a qualquer momento.
6. Comprovar liberação por expiração nos cenários normais de teste.
7. Abrir Workspace e alternar tema sem impactar o dark fixo do popup.
8. Entender quando o Wake Lock é inelegível/revogado.
9. Ativar opt-in Beta/Dev e testar reprodução HTML5 **visível** sem afetar a segurança do sistema.
10. Consultar documentação precisa sobre limites do Windows e da plataforma.

Se um requisito principal falhar em Edge, o lançamento não deverá anunciar paridade plena até correção ou limitação explícita. Se o comportamento de bloqueio do Windows persistir, não se trata automaticamente de defeito da extensão: separar falha de API, tela, suspensão e política de sessão.

---

## 16. Perguntas de implementação ainda abertas

Não impedem o início do projeto, mas requerem decisão informada na POC:

1. **Idade mínima de Chrome/Edge** a suportar, confirmada pela máquina de teste e ciclo de `chrome.alarms`.
2. **Modo de retomada após restart:** proposta default OFF; validar UX e eventos reais.
3. **Nome definitivo e ícone**: Stay Awake provisório; produzir ícone vetorial próprio inspirado em display/energia, não duplicar marcas.
4. **Formato do diagnóstico:** cópia de relatório local; sem upload automático.
5. **Escolha de licença:** MIT ou outra, decisão do mantenedor.
6. **App website:** React/Vite estático ou site de documentação ainda mais simples, desde que GitHub Pages possa publicar sem SSR.
7. **Automação de testes em Edge:** validar se infra CI executa Edge compatível; manter smoke manual oficial enquanto necessário.
8. **Status do `chrome.power` após worker encerrar:** validar empiricamente no browser alvo; a UI não deve declarar resultados não observáveis.

---

## 17. Referências e documentação de base

Documentos oficiais consultados em **15/10/2026**; APIs e políticas podem evoluir.

1. Google — Power API: https://developer.chrome.com/docs/extensions/reference/api/power
2. Google — Alarms API: https://developer.chrome.com/docs/extensions/reference/api/alarms
3. Google — Storage API: https://developer.chrome.com/docs/extensions/reference/api/storage
4. Google — Service worker lifecycle: https://developer.chrome.com/docs/extensions/develop/concepts/service-workers/lifecycle
5. Google — Extensão Hello World / Load unpacked: https://developer.chrome.com/docs/extensions/get-started/tutorial/hello-world
6. Google — Manifest V3 Content Security Policy: https://developer.chrome.com/docs/extensions/reference/manifest/content-security-policy
7. MDN — Screen Wake Lock API: https://developer.mozilla.org/en-US/docs/Web/API/Screen_Wake_Lock_API
8. MDN — WakeLock.request: https://developer.mozilla.org/en-US/docs/Web/API/WakeLock/request
9. Microsoft — APIs suportadas por extensões Edge: https://learn.microsoft.com/en-us/microsoft-edge/extensions/developer-guide/api-support
10. Microsoft — Portar extensão Chrome para Edge: https://learn.microsoft.com/en-us/microsoft-edge/extensions/developer-guide/port-chrome-extension
11. Microsoft — Sideload de extensões no Edge: https://learn.microsoft.com/en-us/microsoft-edge/extensions/getting-started/extension-sideloading
12. GitHub — Publicar com GitHub Pages: https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site
13. Vite — Deploy estático no GitHub Pages: https://vite.dev/guide/static-deploy.html
14. GitHub CLI — Upload de assets em releases: https://cli.github.com/manual/gh_release_upload

### Nota sobre verificação de precisão

- A documentação do Chrome confirma `chrome.power('display'|'system')`; não confirma garantia de ignorar bloqueio de sessão independente.
- O Edge lista `power`, `alarms` e `storage` como APIs suportadas em MV3 no desktop; o comportamento real ainda precisa de teste.
- `Screen Wake Lock` depende de visibilidade e pode ser revogado; não é substituto de API de background.
- Alarmes podem atrasar após suspensão e suas regras de persistência variam por versão/browser; por isso manter `expiresAt` e rotina de reconciliação.
- O website GitHub Pages é estático e separado da build privilegiada da extensão.

---

## 18. Próxima ação objetiva

**Implementar a Fase 0 (POC) antes de avançar para um design polido**:

1. Bootstrap Manifest V3 com permissão `power` e background tipado.
2. Página popup simples com iniciar/parar (`display`).
3. Persistir `expiresAt` e criar alarme.
4. Instalar localmente no Chrome e no Edge seguindo os tutoriais deste documento.
5. Executar testes de worker ocioso, recarga e browser restart.
6. Documentar observações em `docs/testing/poc-energy.md`.
7. Revisar ADR-005 com evidência e então iniciar o design final de popup e Workspace.

> **Regra para o agente de desenvolvimento:** não introduzir scripts ocultos de vídeo, simulação de presença, alterações do Windows ou dependência de servidor como substituição da arquitetura aprovada. Divergências devem ser explicitadas e justificadas com evidência técnica.

---

**Fim do documento — Stay Awake / Direção de Produto e Engenharia v1.0.**
