# Distribuição e GitHub Pages

## Estado e fronteiras

O repositório e o website já existem. A distribuição é por instalação descompactada, usando o mesmo build para Chrome e Edge; a paridade física no Windows precisa de homologação. O website estático não recebe `chrome.power`.

A versão numérica `1.0.0` do manifesto não equivale a uma release estável. Gerar ZIP, publicar uma branch ou passar CI também não substitui a [matriz Windows](../testing/manual-qa.md).

## Validar o pacote

No WSL/Ubuntu, Bash, na raiz:

```bash
npx --yes npm@11.21.1 ci
npm run check
npm run verify:build
npm run package:extension
EXTENSION_PATH=.playwright/unpacked-release npm run verify:package
npx playwright install --with-deps chromium
EXTENSION_PATH=.playwright/unpacked-release npm run test:e2e
sha256sum releases/stay-awake-v1.0.0-chrome-edge.zip
```

`verify:package` exige uma pasta de extração nova para evitar conferir um conteúdo e instalar outro. Verifica hash, inventário e bytes de todos os arquivos. O ZIP tem metadados fixos e ordem determinística; duas gerações do mesmo build produziram o mesmo checksum. Não é uma assinatura criptográfica da identidade do publicador.

Python 3 é necessário: `python3` em Linux/WSL, `py -3` em Windows. O README inclui comandos PowerShell. Nunca carregar o ZIP de source como extensão; extrair o ZIP compilado e selecionar a pasta com `manifest.json`.

## CI e artefatos

`ci.yml` possui quality, security e e2e. O primeiro compila e publica o pacote temporário; o E2E baixa esse mesmo ZIP, compara com o build, extrai e testa. `extension-package` e `playwright-evidence` têm retenção de 14 dias. Achados high/critical bloqueiam o job de segurança. Downloads de artefatos Actions podem exigir login; não são automaticamente uma GitHub Release pública.

O runtime é Node 22 e npm 11.21.1. A instalação do npm global acontece somente no runner descartável. A máquina do mantenedor pode usar a versão via `npx`.

## Candidato e versão estável

`release.yml` executa auditorias, check, manifesto, pacote, checksum e E2E antes de publicar qualquer tag. Uma tag precisa corresponder à versão do manifesto. Exemplos de canais:

- `v1.0.0-rc.1`: prerelease explicitamente marcada como candidata; artefato usa `1.0.0-rc.1` no nome.
- `v1.0.0`: release estável somente após QA completo. O push do tag por si só não publica: o gate exige dispatch manual no próprio tag, `windows_qa_confirmed=true` e `qa_evidence_url` de uma issue/PR do projeto com a matriz preenchida.
- Dispatch em branch: valida e disponibiliza artefatos temporários, sem criar release.

A confirmação de Windows é uma declaração humana rastreável; o workflow não mede o hardware. O job de publicação recebe permissão de escrita somente depois que a validação passou. O código de release não faz merge automático.

Para empacotar um candidato local, no WSL/Bash:

```bash
RELEASE_VERSION=1.0.0-rc.1 npm run package:extension
RELEASE_VERSION=1.0.0-rc.1 EXTENSION_PATH=.playwright/unpacked-rc1 npm run verify:package
```

Criar tags, publicar releases e aceitar o produto são ações distintas. Nenhuma tag estável foi criada nesta revisão.

## Pages

Source em Settings → Pages: **GitHub Actions**. `pages.yml` usa Node/npm fixados e `npm ci`, compila `apps/website` com base `/stay-awake/` e publica apenas seu `dist`. URL: <https://lucandradeforte.github.io/stay-awake/>.

O deploy automático acompanha `main` e os paths definidos no workflow; editar uma branch de PR não muda o site live. Ao integrar mudanças, verificar HTTP, assets locais, anchors, FAQ, versão/canal, links de instalação e releases. Antes de existir release estável, usar a coleção `/releases`, pois `/releases/latest` não resolve um candidato.

## Atualizar e reverter instalação local

Encerrar a sessão, substituir arquivos compilados na pasta estável de instalação e clicar **Atualizar** em `chrome://extensions` ou `edge://extensions`. Confirmar preferência de retomada e o estado após reload. Para rollback, usar um pacote anterior cuja origem e checksum tenham sido conferidos. A extensão não implementa update de loja nem altera políticas do SO.
