# Stay Awake

Extensão local para Google Chrome e Microsoft Edge que solicita manter tela e/ou sistema acordados por um prazo configurável. React no popup e no Workspace, sem conta, backend ou telemetria.

**Status: beta técnica em estabilização.** O código e o manifesto declaram `1.0.0`; a release estável depende da homologação em Chrome e Edge no Windows. Testes Chromium, mocks e CI não comprovam o comportamento físico do monitor ou do sistema operacional.

> As APIs públicas enviam solicitações de energia. Elas não garantem Windows desbloqueado e não alteram políticas, Registro ou autenticação. O projeto não simula mouse/teclado, não lê suas páginas e não executa processos nativos.

## Requisitos

- Node.js 22, mínimo 22.13; `.nvmrc` seleciona a linha 22.
- npm 11.21.1 para instalar dependências com a política de scripts revisada. É possível usá-lo via `npx`, sem atualizar o npm global.
- Python 3 apenas para empacotar e verificar o ZIP (`python3` no WSL/Linux; `py -3` no Windows).
- Chrome/Edge desktop com instalação local permitida. O binário Chromium do Playwright é provisionado separadamente.

## Preparar e validar

No **WSL/Ubuntu, Bash**, na raiz do repositório:

```bash
nvm use # se o Node for gerenciado pelo nvm
npx --yes npm@11.21.1 ci
npm run check
npm run verify:build
npx playwright install --with-deps chromium
npm run test:e2e
```

No **Windows, PowerShell**, com Node e Python instalados:

```powershell
npx --yes npm@11.21.1 ci
npm run check
npm run verify:build
npx playwright install chromium
npm run test:e2e
```

O E2E inicia e encerra automaticamente o preview do website em `127.0.0.1:4173`; essa porta precisa estar livre. O lockfile já está versionado. Use `npm ci`; não há fallback de CI para uma instalação sem lockfile. A aprovação `allowScripts` cobre somente `esbuild@0.25.12`. Novas versões/scripts exigem revisão. Consulte [política de dependências](docs/security/dependencies.md).

## Instalar a extensão localmente

1. Execute `npm run build:extension`.
2. Chrome: abra `chrome://extensions`, ative **Modo do desenvolvedor** e escolha **Carregar sem compactação**.
3. Edge: abra `edge://extensions`, ative **Modo do desenvolvedor** e escolha **Load unpacked / Carregar sem compactação**.
4. Selecione `apps/extension/dist`, que contém `manifest.json`. A raiz do repositório e o website não são extensões.
5. Fixe o ícone na barra, selecione duração/modo e clique em **Iniciar sessão**. O popup pode ser fechado.
6. Abra **Workspace** para temas, Wake Lock, diagnósticos, configurações e ajuda. O Developer Lab precisa de opt-in em Configurações.

Após alterar o código, recompile e clique em **Atualizar** na página de extensões. Encerrar o navegador libera suas solicitações. Não há auto-update de uma extensão descompactada.

## Pacote e integridade

No **WSL/Bash**:

```bash
npm run release:local
EXTENSION_PATH=.playwright/unpacked-check npm run verify:package
EXTENSION_PATH=.playwright/unpacked-check npm run test:e2e
sha256sum releases/stay-awake-v1.0.0-chrome-edge.zip
```

A pasta de extração de `verify:package` precisa ser nova; use outro nome ao repetir a verificação. O script confere checksum, inventário e conteúdo byte a byte antes de extrair.

No **PowerShell**, a mesma verificação usa variável de ambiente:

```powershell
npm run release:local
$env:EXTENSION_PATH = '.playwright/unpacked-check'
npm run verify:package
npm run test:e2e
Get-FileHash .\releases\stay-awake-v1.0.0-chrome-edge.zip -Algorithm SHA256
Remove-Item Env:EXTENSION_PATH
```

O pacote contém apenas o build da extensão, com manifesto na raiz. O checksum fica em `.zip.sha256`. **Extraia o ZIP antes de carregar a extensão.** O ZIP do código-fonte do GitHub não é instalável. Gerar um pacote local não publica uma release nem significa homologação.

## Funcionalidades

- Modos `display` (tela + sistema) e `system` (sistema; tela pode apagar).
- Presets 15/30/60/120/240/480 min, custom 1..1440 min e duração indefinida explícita.
- Expiração por timestamp absoluto e alarme; recuperação do worker sem timer permanente.
- Retomada após restart desligada por padrão; sessões sem limite exigem opt-in adicional.
- Popup sempre dark; Workspace com tema persistido, diagnóstico, ajuda e exclusão local.
- Wake Lock visível opt-in, com liberação/revogação tratadas.
- Vídeo local ou Canvas no laboratório Beta/Dev, visível, com Stop e cleanup ao ocultar/sair.

“Solicitação ativa” significa que a extensão chamou a API; não é medição do Windows. Badge ou histórico podem falhar independentemente do pedido de energia; a página apresenta advertências quando esses canais acessórios falham.

## Arquitetura

```text
apps/extension/src/
├── background/             # Autoridade de sessão, fila, power, alarms e persistência
├── components/             # Controles e primitivas React
├── entries/popup/          # Popup dark
├── entries/workspace/      # Painel, configurações, temas e diagnóstico
├── features/wake-lock/     # Sentinel restrito à sessão e à página visível
├── features/developer-lab/ # Mídia experimental com geração de operações
├── hooks/                 # Snapshot e mensageria
└── styles/                # CSS e Tailwind 4
apps/website/              # Website estático para GitHub Pages
packages/contracts/        # Tipos, validação runtime e regras de domínio
packages/design-tokens/    # Tokens CSS compartilhados
```

Somente o worker chama `chrome.power`. `chrome.storage.local` mantém estado, preferências e até 80 eventos. Mensagens e eventos de browser compartilham uma fila. As permissões são somente `power`, `storage` e `alarms`, sem host permissions. [Decisões e trade-offs](docs/architecture/README.md).

## Scripts

| Comando                           | Resultado                                                            |
| --------------------------------- | -------------------------------------------------------------------- |
| `npm run dev:extension`           | Edição de UI; APIs privilegiadas exigem build instalado              |
| `npm run dev:website`             | Website Vite local                                                   |
| `npm run typecheck`               | TypeScript dos apps, contratos importados, testes e configs de teste |
| `npm run lint`                    | ESLint                                                               |
| `npm test`                        | Vitest de domínio, controller, listeners e React                     |
| `npm run format` / `format:check` | Escrita/verificação de formatação                                    |
| `npm run build`                   | Builds de extensão e website                                         |
| `npm run check`                   | Formatação, TypeScript, lint, testes e builds                        |
| `npm run test:e2e`                | Chromium MV3 e website; requer builds e browser provisionado         |
| `npm run verify:build`            | Manifesto, permissões e entradas compiladas                          |
| `npm run release:local`           | Build de extensão e ZIP/checksum                                     |
| `npm run verify:package`          | Integridade e extração em pasta nova                                 |

## GitHub e distribuição

- [Repositório](https://github.com/lucandradeforte/stay-awake)
- [Website público](https://lucandradeforte.github.io/stay-awake/)
- [Versões e artefatos publicados](https://github.com/lucandradeforte/stay-awake/releases)
- [Feedback e issues](https://github.com/lucandradeforte/stay-awake/issues)

A CI verifica código, segurança e E2E do ZIP extraído, com relatórios e traces de falhas por 14 dias. Pages publica somente o website após integração em `main`. A branch de estabilização não atualiza o site público automaticamente. Consulte [distribuição](docs/release/deployment.md).

Candidatos usam tag `v1.0.0-rc.N`, preservando o manifesto numérico. A tag estável exige todos os gates, QA Windows e evidência pública; o workflow verifica a declaração de QA no dispatch manual. Não foi publicada uma tag estável nesta estabilização.

## Validação e limitações

Consulte [resultados automatizados](docs/testing/stabilization.md) e [matriz Chrome/Edge Windows](docs/testing/manual-qa.md). A automação de desktop Windows não inicializou a partir deste workspace WSL, portanto a matriz física permanece pendente.

Alarmes podem atrasar após suspensão. Screen Wake Lock depende de visibilidade/elegibilidade e pode ser revogado. O vídeo experimental não garante criação de bloqueador nativo. A extensão não funciona com todas as instâncias do navegador encerradas. Aprovação de acessibilidade automatizada não substitui testes com pessoas, leitor de tela ou escalas do Windows.

## Documentação e licença

[Direção corrente](docs/product-direction.md), [auditoria de referência](docs/reference/product-direction-audit-2026-10-16.md), [design system](docs/design/design-system.md), [changelog](CHANGELOG.md).

Licença MIT, já presente no repositório. Consulte [LICENSE](LICENSE). Disponibilidade de marca não foi auditada nesta entrega.
