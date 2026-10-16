# Changelog

## [Unreleased] — estabilização de 16/10/2026

### Correções

- Gerações de operação isolam `play()` pendente de Stop, troca de fonte, unmount e retomada. Cleanup idempotente libera tracks, RAF e Object URLs; pausa suspende desenho.
- Estado persistido e preferências são validados em runtime; `patch: null` possui regressão explícita (já era rejeitado na baseline).
- Controller compensa falhas críticas e retorna snapshot coerente mesmo com erro secundário; badge/log não desfazem solicitação válida. Stop libera power antes de I/O.
- Dispatch da UI trata rejeições sem unhandled promises. Reiniciar prazo preserva `null` da sessão ilimitada.
- Wake Lock ignora aquisições/releases antigos e trata falhas de liberação, ocultação e unmount.
- Estado ativo tem texto aplicável aos dois modos. Website informa beta, evita link latest inexistente e distingue links por sublinhado. Troca de tema não anima o fundo do CTA através de contraste insuficiente.

### Qualidade e manutenção

- 50 testes Vitest, incluindo 50 ciclos instrumentados de mídia; 9 E2E Chromium/website.
- TypeScript inclui testes; axe-core cobre popup, Workspace dark/light e website desktop/mobile.
- ESLint 10, Vitest 5 e Tailwind 4 eliminam os achados atuais; npm 11.21.1, Node 22, lockfile e aprovação restrita de esbuild.
- CI separa qualidade, segurança e E2E do ZIP extraído; falhas preservam trace/screenshot e relatórios por 14 dias.
- ZIP com ordem/metadados fixos, verificação de checksum, inventário e bytes antes da extração.
- Gate estável exige QA Windows documentado. Documentação reconciliada e Prettier com verificação automatizada.

**Limite de entrega:** nenhuma tag estável e nenhuma homologação física de Chrome/Edge/Windows foi produzida nesta revisão. A publicação do website revisado depende da integração em main. Ver a matriz de validação.

## [1.0.0] — 2026-10-15 (código-fonte inicial; validação real pendente)

- Extensão Manifest V3 comum a Chrome e Edge: `chrome.power`, presets, duração customizada/indefinida.
- Service worker com eventos, reconciliação, alarmes, comandos e logs locais sanitizados.
- Popup dark-first, Workspace com temas e painel de sessão.
- Diagnósticos, configurações de retomada e reset de dados.
- Screen Wake Lock opt-in na página visível.
- Developer Lab opt-in com vídeo gerado em Canvas ou arquivo local.
- Landing page estática Vite e deploy via GitHub Pages.
- CI, GitHub Releases, checksum e testes Vitest do domínio e background mock.

**Histórico:** baseline inicial. A validação automatizada atual está registrada acima e em `docs/testing/stabilization.md`; homologação física permanece pendente.
