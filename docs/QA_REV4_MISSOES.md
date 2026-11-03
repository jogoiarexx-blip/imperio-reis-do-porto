# REV4 — Campanha, checkpoints, entrega e repetição (03/11/2026)

## Motivo e prioridade (GDD, fase 2)

Antes, os diálogos alteravam `mission.id` e `mission.step`, mas a campanha não tinha um estado de falha nem sistema próprio de retry. A missão 3 podia ser concluída somente por uma reforma e conversa; não havia serviço legítimo de transporte. O save não registrava estado da tentativa da missão nem um checkpoint serializável. O objetivo dessa revisão é tornar **as missões 1–3 repetíveis e resistentes a reload**, mantendo o mapa e a história da REV3.

## Mudanças implementadas

| Sistema | Antes (REV3) | Depois (REV4) |
| --- | --- | --- |
| Missões | id/etapa/concluídas | estado `active/failed/finished`, último checkpoint com posição/veículo/interior |
| M01 | diálogos e recompensa | checkpoints a cada conversa, recompensa protegida pela FSM |
| M02 | decisão Bellori única | decisão preservada em retry e reload, checkpoint após avanço |
| M03 | reforma e conversa no bar | reforma → retirar documentos na oficina → entrega ao bar, prazo de 240 s de simulação |
| Falha | sem condição | fim de prazo na entrega ou saúde 0; UI com retry e tecla `R` |
| Repetição | ausente | volta ao último checkpoint, recomeça o prazo sem duplicar dinheiro/reforma |
| Salvar | somente um registro local | save principal e backup local do estado anterior, fallback ao backup se principal corrompido |
| Compatibilidade | saves REV1–REV3 | normaliza saves sem FSM; m03 antiga etapa 1 é migrada para entrega (etapa 2) |
| HUD | objetivo textual | objetivo com prazo e localização/distância do próximo destino |

## Evidências

- `tests/mission-fsm.test.ts`: fluxo M01–M03, etapa errada, exclusividade da recompensa, Bellori, retirada/entrega, prazo, falha, retry, serialização, migração e backup. Também verifica uma rota geométrica caminhável evitando edifícios.
- `tests/city.test.ts`, `tests/progress.test.ts`: atualizados para a nova etapa de retirada da missão 3.
- Verificação estática das classes puras TypeScript: `tsc --strict --skipLibCheck --target ES2022 --module commonjs --moduleResolution node ...` sem erros.

## Limites e pendências

- Testes unitários e simulação por estados **não equivalem** a um teste humano de percorrer a cidade e concluir as três missões no navegador.
- Não há ainda sistema de dano real, combate, cinematicidade com animações ou física de veículos avançada; o timer da entrega é a condição de falha alcançável por gameplay.
- O backup local é uma proteção de um estado anterior, não um sistema de múltiplos slots ou backup em nuvem.
- Missões 4–6, facções complexas, Velho Porto parcial e o restante da campanha não foram implementados nesta revisão.

## Certificação

Execute `npm run test`, `npm run qa:sanity` e `npm run build`. No GitHub Pages, verificar manualmente: entrar na oficina, falar com Helena, visitar o bar, voltar, reformar, retirar documentos, falhar por prazo e repetir por `R`, entregar e recarregar o save. Marcar a certificação humana separadamente.
