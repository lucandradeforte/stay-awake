# Design system — Stay Awake

## Referências

Vercel, Next.js, shadcn/ui e GitHub **como direção**, não cópia de layouts ou logos. Componentes de linguagem shadcn inspirados em Tailwind com Radix Switch para acessibilidade. Remix Icon para iconografia.

## Tokens (packages/design-tokens/theme.css)

| Token      | Dark      | Light (Workspace apenas) |
| ---------- | --------- | ------------------------ |
| background | `#0B0D10` | `#F7F8FA`                |
| surface    | `#111419` | `#FFFFFF`                |
| raised     | `#1A1F26` | `#F0F2F5`                |
| border     | `#292F38` | `#DFE3E8`                |
| text       | `#E7EAF0` | `#171B20`                |
| muted      | `#9AA4B2` | `#5F6875`                |
| accent     | `#8FDCB1` | `#276749`                |
| warning    | `#E7C479` | `#946414`                |

Tipografia: Inter se instalada pelo usuário, Segoe UI e system-ui como fallback sem download de fontes. 4px spacing base. Bordas discretas, sombras restritas.

## Acessibilidade

- Texto de estado junto da cor; jamais sinalização apenas cromática.
- Inputs acessíveis por teclado; `aria-pressed` em seleção; `aria-label` em toggles e ícones.
- Foco visível, `prefers-reduced-motion`, adaptação para 320px+.
- Não anunciar cronômetro com `aria-live` por segundo.

## Telas

1. **Popup dark** — cabeçalho, estado de energia, durações, modo, CTA e link Workspace.
2. **Workspace / Sessão** — controle da sessão, Wake Lock, avisos e apresentação.
3. **Diagnósticos** — engine, eventos sanitizados, copiar resumo e limpar.
4. **Developer Lab** — visível somente após opt-in nas configurações.
5. **Configurações** — retomada, Beta/Dev, limpeza de dados.
6. **Ajuda** — conceitos, limites, repositório e feedback.
7. **Landing (GitHub Pages)** — produto, features, instalação e FAQ.
