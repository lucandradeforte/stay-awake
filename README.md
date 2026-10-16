# Stay Awake

**Uma extensão local-first para Google Chrome e Microsoft Edge** que solicita que tela e/ou sistema permaneçam acordados por um período configurável. Interface dark-first com popup React e Workspace completo, mais laboratório de mídia HTML5 experimental.

> **Limite importante:** as APIs públicas enviam solicitações de energia. Elas **não garantem que o Windows permaneça desbloqueado** nem alteram GPOs, Registro ou autenticação. Este projeto não simula mouse/teclado, não acessa suas abas e não roda processos nativos.

## Status de entrega

Código-fonte da **v1.0.0** com UI, domínio, armazenamento, service worker, testes, website, GitHub Actions e documentação. **Necessário validar `npm install`, build e Chrome/Edge no seu ambiente**: o ambiente de geração não tinha acesso ao npm registry. Não confundir este ZIP do repositório com um ZIP compilado e instalável.

## Requisitos

- Node.js 22 LTS (ou Node >= 20.19), npm >= 10;
- Chrome ou Edge recentes com permissão para instalar extensões localmente;
- Git opcional; Python 3 necessário apenas para o comando `npm run package:extension` (o `.github/workflows/release.yml` usa Linux com Python disponível).

## Desenvolvimento rápido

```bash
npm install
npm run check
npm run build:extension
```

Após o primeiro `npm install`, o npm gera `package-lock.json`: **faça commit desse arquivo** para builds reprodutíveis. Os workflows usam `npm ci` quando o lockfile existir; sem lock usam instalação normal.

**Instalar o build local:**

1. Chrome: `chrome://extensions` → ative **Modo do desenvolvedor** → **Carregar sem compactação**.
2. Edge: `edge://extensions` → ative **Modo do desenvolvedor** → **Load unpacked / Carregar sem compactação**.
3. Nos dois, selecione **`apps/extension/dist`** (não a raiz do repositório).
4. Fixe Stay Awake na barra. Abra o popup, selecione prazo/modo e clique em **Iniciar sessão**.
5. Abra **Workspace** para página completa, Wake Lock, diagnósticos e configurações.
6. Ative Developer Lab manualmente em Workspace → Configurações para testar vídeo HTML5 visível.

Após editar o código: `npm run build:extension`, depois clique no botão **Atualizar** da extensão em `chrome://extensions` / `edge://extensions`.

### Criar o ZIP instalável

```bash
npm run release:local
```

Isso gera `releases/stay-awake-v1.0.0-chrome-edge.zip` e SHA-256. **Extraia o ZIP antes de carregar a extensão**: o navegador precisa da pasta que contém `manifest.json`. O ZIP do repositório que contém `apps/` não pode ser carregado diretamente como extensão.

## Scripts

| Comando | Resultado |
|---|---|
| `npm run dev:extension` | Dev server Vite para edição UI; para testar `chrome.power`, use build instalado, não apenas a página web |
| `npm run dev:website` | Site local Vite |
| `npm run typecheck` | TypeScript estrito |
| `npm run lint` | ESLint |
| `npm test` | Vitest unitários + integração de controller (mocks Chrome) |
| `npm run build` | Builds de extensão e site |
| `npm run test:e2e` | Smoke E2E com Playwright Chromium (requer browser instalado) |
| `npm run check` | Typecheck, lint, testes e builds |
| `npm run release:local` | Build e ZIP/checksum da extensão |

## Arquitetura

```text
apps/extension/src/
├── background/                 # Única autoridade da sessão, alarmes, chrome.power
├── components/                 # Primitivos UI, controles e marca
├── entries/popup/              # Popup dark fixo
├── entries/workspace/          # Página completa dark/light
├── features/wake-lock/         # Screen Wake Lock visível
├── features/developer-lab/     # Vídeo HTML5 visível, opt-in
├── hooks/                     # Snapshot + mensagens
└── styles/                    # Tailwind + tokens + UI CSS
apps/website/                  # Site estático Vite para GitHub Pages
packages/contracts/            # Contratos, validação de comandos e regras puras
packages/design-tokens/        # Tokens CSS compartilhados
```

O popup e Workspace enviam **mensagens tipadas** ao service worker MV3. Somente o service worker acessa `chrome.power`. `chrome.storage.local` mantém sessão, preferências e até 80 eventos sanitizados; `chrome.alarms` sinaliza expiração (não há promessa de precisão de segundos). Eventos `onInstalled`, `onStartup` e primeiro despertar do worker reconciliam o estado. Por padrão, sessões **não** são retomadas depois do navegador reiniciar.

A aplicação não usa `history`, `tabs`, `scripting`, `webRequest`, `nativeMessaging` nem host permissions. `chrome.tabs.create` para URL da própria extensão funciona sem permissão `tabs` na API Chromium, sujeito a validação do navegador instalado.

## Hospedagem: seu GitHub

Repositório sugerido: `https://github.com/lucandradeforte/stay-awake`. Para criar:

```bash
git init
git branch -M main
git add .
git commit -m "feat: Stay Awake v1.0.0 source"
git remote add origin https://github.com/lucandradeforte/stay-awake.git
git push -u origin main
```

Crie o repositório vazio antes desse `git push`. Não é necessário publicar nenhuma extensão em lojas.

**GitHub Pages:** Settings → Pages → Build and deployment → Source = GitHub Actions. Execute workflow `Website (GitHub Pages)` ou envie alteração ao website. Endereço esperado, se o repositório for `stay-awake`: `https://lucandradeforte.github.io/stay-awake/`. Caso escolha outro nome, altere `base` no arquivo `apps/website/vite.config.ts` ou defina `GITHUB_PAGES_BASE` no workflow de build.

**Releases:** depois de validar a primeira instalação local, crie tag:

```bash
git tag v1.0.0
git push origin v1.0.0
```

O workflow `Release extension` executa verificações, empacota `dist` e publica o ZIP com checksum SHA-256 em GitHub Releases. O workflow Pages publica apenas o site de apresentação e instruções: **o site não recebe poderes de extensão**.

## E2E automatizado

```bash
npm run build:extension
npx playwright install chromium
npm run test:e2e
```

Os testes E2E cobrem os fluxos de interface do Chromium. A validação real de Chrome e Edge continua necessária.

## Teste manual obrigatório

Ver `docs/testing/manual-qa.md`. Testar Chrome e Edge **separadamente**; fechar popup e aguardar; prazo finito; reinício do navegador com retomada desativada/ativada; modo `system`; tema; Wake Lock visível e oculto; vídeo gerado e arquivo local; modo privado com extensão desabilitada; nenhum bloqueio do Windows é inferido automaticamente.

## Limitações conhecidas

- Chrome/Edge precisam estar abertos; encerrá-los libera solicitações da extensão.
- O navegador pode suspender/terminar o service worker; a expiração é verificada quando o evento puder ser processado.
- Screen Wake Lock exige documento visível e pode ser revogado.
- Não há garantia de desbloqueio contínuo da sessão Windows.
- O player experimental é **visível** e interrompido ao ocultar sua aba; não é um bypass de segurança.
- Este pacote não inclui dependências `node_modules` nem binários compilados. O build deve ser realizado localmente ou por CI.

## Documentos

- [Direção de Produto e Engenharia](docs/product-direction.md)
- [Arquitetura e decisões](docs/architecture/README.md)
- [Design system](docs/design/design-system.md)
- [Matriz de testes](docs/testing/manual-qa.md)
- [Distribuição e GitHub Pages](docs/release/deployment.md)
- [Changelog](CHANGELOG.md)

## Licença

MIT. Consulte [LICENSE](LICENSE). Revise o nome e possíveis conflitos de marca antes de publicação pública ampla.
