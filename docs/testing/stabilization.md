# Estabilização — evidências e gates

Execução em 16/10/2026, partindo de `37a205519e55b3fa812cf6fedcc4c258987bd368`. A branch local estava limpa e a main remota apontava ao mesmo commit. A direção v1.1 fornecida foi comparada com código, contratos, testes, docs e workflows; a direção corrente é v1.2.

Este registro distingue inspeção, reprodução, validação pelo executor e aceite. Não houve auditor independente nesta entrega. **Homologação de produto/hardware e release estável permanecem abertas.**

## Divergências reconciliadas

- README/arquitetura ainda instruíam criar repositório e lockfile e diziam que o registry não estava acessível. Ambos já existiam; a documentação agora descreve instalação reprodutível e validações executadas.
- A alegação SA-103 de aceitar `patch: null` não se reproduziu no commit auditado: `!!candidate.patch` já rejeitava null. O parser de preferências armazenadas e a validação completa de sessões precisavam de correção, agora coberta.
- SA-101 foi reproduzido antes da alteração: 6 dos 9 testes novos falharam em resposta tardia, troca de fonte, desmontagem, pausa e sanitização. Os 9 passaram após o hook de ciclo de vida, inclusive 50 ciclos instrumentados.
- Antes do endurecimento do controller, 8 dos 17 testes da etapa falharam. Depois, falhas de storage, alarmes, energia, badge e log, recuperação e serialização passaram. A suíte posterior acrescentou listeners reais do background com adaptadores e falhas acessórias de preferências/limpeza.
- Reiniciar uma sessão ilimitada convertia `null` em 60 minutos por `?? 60`; corrigido e reproduzido em teste React e E2E.
- A UI relançava promises já registradas como erro; agora retorna falha tratada. Wake Lock também invalida operações obsoletas e captura rejeição de release.
- Site live respondeu HTTP 200, mas não havia release publicada e os links `releases/latest` não eram apropriados. A versão revisada usa a coleção e explicita beta.
- axe-core identificou links do rodapé distinguíveis apenas por cor e contraste transitório no CTA durante troca de tema. Sublinhado e remoção da transição de fundo corrigiram os cenários; não foram desabilitadas regras para fazer os testes passar.
- No WSL, o probe HTTP inicial do Playwright em porta sem listener permaneceu pendente. O preview agora inicia aguardando a linha de prontidão do Vite, com timeout limitado; os testes continuam verificando HTTP 200 e conteúdo. A porta 4173 precisa estar livre.
- Tooling inicial incluía 10 advisories (2 críticos, 5 altos, 3 moderados). Atualização seletiva e instalação limpa deixaram as duas auditorias em zero na consulta executada. Detalhes em [dependências](../security/dependencies.md).

## Validação executada

Ambiente: WSL/Linux, Node 22.22.2, npm 11.21.1 para instalação, Chromium 156.0.8078.4 distribuído pelo Playwright resolvido no lockfile. Browser plugin não disponível; Playwright foi usado conforme a configuração do projeto.

| Verificação              | Resultado e alcance                                                                                                                          |
| ------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------- |
| Instalação limpa         | `npm ci` via npm 11, lockfile e scripts revisados; sem script pendente de revisão                                                            |
| Formatação               | Prettier em código, configurações, estilos e docs correntes; referência histórica preservada                                                 |
| TypeScript               | Apps, contratos importados e testes/configs de teste                                                                                         |
| Lint                     | ESLint 10; regras Hooks existentes preservadas                                                                                               |
| Vitest                   | 50 testes: contratos 8, controller 20, listeners 6, mídia 9, Wake Lock 5, UI 2                                                               |
| Builds                   | Extensão MV3 e website estático Vite                                                                                                         |
| Manifesto                | MV3, versão numérica alinhada, assets presentes e somente power/storage/alarms                                                               |
| Segurança                | Audit runtime e completo: zero vulnerabilidades na consulta datada                                                                           |
| ZIP                      | SHA-256, inventário de 13 arquivos e bytes comparados ao build; manifesto na raiz; sem source/dependências                                   |
| Reprodutibilidade do ZIP | Duas gerações consecutivas do mesmo build tiveram SHA-256 igual; não é garantia sobre qualquer ambiente futuro                               |
| Playwright               | 9 E2E, incluindo instalação da pasta extraída do ZIP                                                                                         |
| Acessibilidade           | axe-core nas regras WCAG 2/2.1 A e AA de popup, Workspace dark/light e website desktop/mobile, sem violações nos estados examinados          |
| Visual                   | Identidade, conteúdo não vazio, ausência de overlay, console e screenshots de popup, Workspace e website; desktop 1280/1440 e website 390 px |
| Workflows                | actionlint 1.7.12 sem erros na validação executada                                                                                           |
| Website live             | HTTP 200 no endereço publicado; conteúdo revisado só entra após integração/deploy                                                            |
| Chrome/Edge Windows      | Não homologados; erro de inicialização do runtime de desktop WSL antes de obter janela                                                       |

A matriz não é certificação WCAG, benchmark de CPU, teste de leitor de tela ou prova de efeitos físicos do chrome.power. As capturas e relatórios temporários não são incluídos no código-fonte. A CI conserva evidências por 14 dias.

## Fluxos E2E

1. Popup offline → Start → fechar/reabrir página → estado ativo → Stop e badge limpo.
2. Workspace → dark → light persistido após reload → popup ainda dark → Developer Lab somente após opt-in.
3. Modo system + sem limite → reiniciar prazo → duração continua null → nenhum alarme e badge de aviso.
4. Sessão finita → apagar alarme no perfil sintético → interromper worker via CDP → reload → mesma sessão e alarme recriados.
5. Sessão de um minuto → fechar todas as páginas de UI → alarme nativo vence → storage expired → reabrir e conferir badge/alarmes.
6. Lab visível → vídeo Canvas real → pausar/retomar → Stop → sair/voltar ao Lab sem retomada automática.
7. Diagnósticos → limpar eventos → reset confirmado no perfil sintético → sessão e preferências padrão.
8. Website a 1440 px → identidade, instalação, FAQ, overflow, console e axe.
9. Website a 390 px → mesmos fluxos e responsividade.

Falhas assíncronas de play, troca de fonte, arquivo inválido/grande, ocultação e unmount têm regressões DOM com adaptadores. Aquisição e revogação de Wake Lock estão cobertas com sentinels sintéticos; não equivalem a uma medição de energia no Windows.

## CI e publicação

O PR draft reúne commits por etapa. Por escolha do mantenedor, a publicação usa a integração GitHub conectada. A API gera novos metadados de commit; os SHAs locais originais diferem dos remotos, mas cada tree Git foi comparada integralmente antes de publicar. A branch local final é reconciliada com a história remota somente após a confirmação de conteúdo; a história original fica preservada em branch local de checkpoint.

O primeiro run intermediário do PR falhou porque a política npm 11 entrou antes do workflow fixar a versão do gerenciador. O commit seguinte corrige o workflow e adiciona security/e2e. Esse run intermediário não foi tratado como validação concluída. Consulte o último SHA e os checks do [PR](https://github.com/lucandradeforte/stay-awake/pull/1), pois novas alterações exigem nova execução.

Nenhum merge automático, tag final ou declaração de homologação foi feito. Artefatos Actions são resultados de validação; não substituem uma release estável. O gate estável exige dispatch manual e referência pública à matriz Windows preenchida.

## Gates ainda abertos

- QA-01..20 em Chrome e Edge Windows, com versões e pacote/checksum identificados.
- Medir tela, suspensão e lock screen separadamente; manter políticas do SO intactas.
- Smoke de vídeo local/gerado e Wake Lock nos dois browsers físicos, restart completo, escalas 100/125/150% e tecnologia assistiva.
- Integrar o PR após revisão; conferir o conteúdo revisado no Pages após deploy.
- Publicar candidato ou stable pelo workflow conforme o canal e os gates; não houve release estável nesta entrega.

Essas pendências são verificações externas e decisões de aceitação. Não foram marcadas como resolvidas por passar nos testes automatizados.
