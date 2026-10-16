# Dependências e segurança

Revisão de 16/10/2026. A instalação usa `package-lock.json`, Node 22 (mínimo 22.13) e npm 11.21.1. `.nvmrc` seleciona a linha 22; o npm é fixado em `packageManager` e nos workflows. Não é necessário atualizar o npm global da máquina: no WSL, use `npx --yes npm@11.21.1 ci`.

## Resultado observado

- Baseline após adicionar ferramentas de teste React: 10 achados (2 críticos, 5 altos, 3 moderados), incluindo ferramentas de desenvolvimento.
- Após atualização: `npm audit` retorna zero vulnerabilidades na consulta executada. Isso é um resultado datado da base de advisories, não garantia de ausência de vulnerabilidades futuras.
- ESLint 9 chegou ao fim de suporte. ESLint 10.12.0, `@eslint/js` 10.0.1, `typescript-eslint` 8.71.2 e plugin Hooks 7.1.1 têm peer dependencies compatíveis. As duas regras Hooks já usadas foram preservadas; regras específicas do React Compiler exigem adoção separada.
- Vitest 5.0.5 remove a cadeia vulnerável de `tinypool`/mocker da linha anterior. Os 47 testes existentes após as correções passaram nessa versão.
- Tailwind 4.3.3 e seu plugin PostCSS substituem a cadeia Tailwind 3/braces sem correção disponível para o achado de stack exhaustion. A mudança é de build/CSS; validar aparência com E2E. Autoprefixer e configuração Tailwind 3 foram removidos; tokens e classes próprias permanecem.
- Vite 6.4.4 e TypeScript 5.8.3 foram mantidos; atualizar uma major sem necessidade aumentaria o escopo.

## Scripts de instalação

O `postinstall` de `esbuild@0.25.12` foi inspecionado: seleciona/valida o executável nativo da plataforma e possui fallback de obtenção do pacote correspondente no registry npm. O comando npm 11 `install-scripts approve esbuild` gravou exclusivamente `esbuild@0.25.12` em `allowScripts`. Instalação limpa com npm 11 e `install-scripts ls` confirmou ausência de scripts não revisados. Não foram aprovados scripts globalmente ou por wildcard.

`audit=false` evita uma consulta automática a cada instalação. A verificação explícita de runtime e ferramentas faz parte do job de segurança, bloqueando severidades high/critical. Não há exceções ativas. Qualquer exceção futura precisa de advisory, justificativa de exposição, responsável e validade, sem remover o gate indiscriminadamente.

No WSL/Bash, para revisar novamente:

```bash
npx --yes npm@11.21.1 ci
npx --yes npm@11.21.1 install-scripts ls
npm audit --omit=dev --audit-level=high
npm audit --audit-level=high
npm outdated
npm run check
npm run test:e2e
```

O CI e releases usam runners descartáveis. Versões no lockfile devem ser revisadas antes de aprovar um novo script. Atualizações major não devem ser feitas com `audit fix --force`.

Fontes consultadas: [suporte ESLint](https://eslint.org/version-support/), [compatibilidade typescript-eslint](https://typescript-eslint.io/users/dependency-versions/), [migração Vitest](https://vitest.dev/guide/migration/), [migração Tailwind](https://tailwindcss.com/docs/upgrade-guide), [advisory braces](https://github.com/advisories/GHSA-vfj7-8cjw-p6xm), [aprovação npm](https://docs.npmjs.com/cli/v11/commands/npm-install-scripts/).
