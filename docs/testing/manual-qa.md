# Plano de testes e validação manual — v1.0.0

## Pré-condições

- Instalação local da extensão compilada no Chrome e, separadamente, no Edge.
- Computador pessoal com permissão para testar políticas de energia; sem alterações no Registro/GPO.
- Comparar conectado à tomada vs bateria, sem assumir que resultados são iguais.
- Registrar navegador/versão, duração prevista, observação real, modo e circunstâncias.

## Casos essenciais (realizar em Chrome e Edge)

| ID | Procedimento | Esperado |
|---|---|---|
| QA-01 | Instalar `dist` via Load unpacked | Sem erros no manifest/worker; popup abre |
| QA-02 | Iniciar 15 min em `display`; fechar popup | Badge `ON`; estado volta ativo ao reabrir |
| QA-03 | Parar pelo popup | Badge limpo; solicitação liberada |
| QA-04 | Executar `system` | Estado registra `system`; a tela pode desligar |
| QA-05 | Criar sessão 1 min customizada | Expiração gera `expired`, remove badge, sem solicitação ativa |
| QA-06 | Iniciar `null` sem limite | Não criar alarme; aviso sobre consumo |
| QA-07 | Reiniciar prazo de 15 min | Nova expiração absoluta e alarme atualizado |
| QA-08 | Fechar/reabrir navegador com retomada OFF | Sessão não retorna automaticamente |
| QA-09 | Retomada ON e sessão finita não vencida | Solicitação recuperada ao startup |
| QA-10 | Retomada ON sem retomar ilimitado | Sessão ilimitada não retorna |
| QA-11 | Ativar modo Developer Lab | Aba aparece; quando desativado fica inacessível |
| QA-12 | Alternar tema Workspace | Dark/light persistem; popup segue dark |
| QA-13 | Wake Lock com aba visível e sessão ativa | Estado de aquisição ou mensagem de recusa explícita |
| QA-14 | Ocultar aba Workspace | Wake Lock revogado/liberado; reaquisição só ao retornar e autorizado |
| QA-15 | Iniciar vídeo Canvas e ocultar aba | Vídeo/stream encerrados; não roda oculto |
| QA-16 | Reproduzir arquivo local | File playback visível; nenhum upload remoto |
| QA-17 | Apagar dados locais | Solicitação encerrada, preferências resetadas |
| QA-18 | Copiar diagnóstico | JSON com modo/tempo/eventos sem URL, título de aba, PII |
| QA-19 | Recarregar extensão durante sessão | Recuperação conforme preferência, sem badge falsamente ON |
| QA-20 | Validar teclado, foco, contraste e responsividade | Controles acessíveis e sem overflow crítico |

## Evidência por experimento

| Data | Navegador | Modo | Tomada/Bateria | Duração | Tela ligada? | Sessão bloqueou? | Suspendeu? | Observações |
|---|---|---|---|---|---|---|---|---|
| | | | | | | | | |

Não apresentar resultado positivo de `chrome.power` como prova de desbloqueio do Windows. Laboratório de vídeo é opt-in e não possui garantia de disparar bloqueador interno Chromium.

## Critérios para V1 estável

- `npm run check` sem falhas;
- Smoke test real no Chrome e no Edge;
- expiração, reinício e recuperação conferidos;
- página GitHub Pages e ZIP Release publicados;
- README e avisos de limitações revisados;
- nenhum acesso a domínios/sites/atividade do usuário.

**Status atual:** testes escritos e matriz definida; execução em navegadores do usuário pendente.

## E2E automatizado (Chromium)

```bash
npm run build:extension
npx playwright install chromium
npm run test:e2e
```

`tests/e2e/extension.spec.ts` abre contexto persistente com extensão MV3 carregada e verifica START/STOP no popup, tema Workspace e habilitação manual do Developer Lab. Testes em Edge real continuam requerendo validação manual; não presumir paridade apenas pelos testes Chromium.
