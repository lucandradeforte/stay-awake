# GitHub Pages e distribuição — Stay Awake

## 1. Repositório

Criar repositório `stay-awake` na conta `lucandradeforte`, preferencialmente público se o site Pages e downloads serão públicos. `git init && git add . && git commit -m "feat: Stay Awake v1"`, adicionar remote e enviar branch `main`.

## 2. Instalar dependências e validar

```bash
npm install
npm run check
npm run release:local
```

Faça commit do `package-lock.json` após instalar. O ZIP do projeto de código-fonte **não** é o ZIP de extensão compilada.

## 3. GitHub Pages

- Repositório → Settings → Pages.
- Source: **GitHub Actions**.
- Abra Actions → **Website (GitHub Pages)** → Run workflow, ou altere e envie arquivos do site na branch `main`.
- URL: `https://lucandradeforte.github.io/stay-awake/` (se o nome permanecer `stay-awake`).
- O site é estático; não possui permissões `chrome.power`.

## 4. Distribuição local

- `npm run release:local` compila a extensão e gera ZIP SHA256 no diretório `releases/`.
- Chrome: `chrome://extensions` → Developer mode → Load unpacked → selecionar pasta extraída contendo manifest.
- Edge: `edge://extensions` → Developer mode → Load unpacked → mesma pasta.
- **Atualização:** substituir arquivos compilados na pasta escolhida e clicar **Atualizar**.
- **Segurança:** conferir a origem da release e checksum antes de extrair arquivos obtidos online.

## 5. Publicação release automatizada

Depois que os testes manuais passarem, `git tag v1.0.0 && git push origin v1.0.0`. O workflow executa checks, cria ZIP, checksum e GitHub Release. Publicar tag **somente depois** de executar o navegador no ambiente real.

## 6. Repositório com outro nome

Se o repositório não se chamar `stay-awake`, modifique `apps/website/vite.config.ts` (`base`) e as URLs nos fontes website/Workspace/README. Para um site de raiz (repo `username.github.io`), use `base: '/'`.
