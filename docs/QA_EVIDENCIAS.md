# QA verificável — REV3 (03/11/2026)

## Base de comparação

- **Antes (REV2):** Páginas publicadas com Vite; 4 quadras, 28 imóveis, oficina e bar; diálogo disparado ao entrar no imóvel; porta E permitia saída em qualquer local do interior; `shell` era um vidro sobre bloco opaco; save não guardava imóvel ativo; inspetor de lote ausente.
- **Depois (REV3):** interação lateral da porta validada pela malha urbana, saída junto à porta, personagens essenciais no interior, prateleiras/mesas por estabelecimento, `shell` com profundidade real, interior persistido, inspetor F3, vitrines de esquina, cruzamentos demarcados.
- **Não expandido:** outras áreas/distritos, sistema de perseguição/combate, múltiplos andares; esta revisão prioriza estabilização de Santa Ângela.

## Evidências

| ID | Funcionalidade | Status | Método | Evidência | Regressão? |
| --- | --- | --- | --- | --- | --- |
| CITY-001 | Geração determinística | pass (local) | `scripts/qa-sanity.cjs` | 4 quadras, 28 imóveis sem erro do validador | Não observada |
| CITY-002 | Porta no lado correto e lotes válidos | pass (local) | `tests/validator.test.ts`; script offline | Validador acusa porta invertida | Não observada |
| INT-001 | Façade correta e proximidade da saída | pass (lógica) | `tests/interaction.test.ts`; script offline | Testes dos dois sentidos de entrada e saída | Não observada |
| INT-002 | Interior com NPC e mobília visível | not run (visual) | Playtest navegador | Necessário testar em Chromium | Não certificada |
| INT-003 | Vitrine `shell` com profundidade | not run (visual) | Playtest navegador | Verificar câmera e parallax dos vidros | Não certificada |
| GAME-001 | Falar com Helena e Rafael, missões 1–3 | not run (jornada humana) | Playtest completo | Requer atravessar as missões no jogo | Não certificada |
| SAVE-001 | Carregamento de save antigo dentro de imóvel | pass (lógica) | `tests/progress.test.ts`; script offline | `interiorId` inferido do volume | Não observada |
| PAGE-001 | Build publicado no GitHub Pages | not run | CI GitHub Actions | Preencher com link do run após publicação | Não certificada |
| PERF-001 | FPS/draw calls em rota controlada | not run | Browser profiler | Sem comparação antes/depois validada | Não certificada |

**Como reproduzir localmente:** `npm run qa:sanity` executa inspeção de sintaxe e invariantes usando TypeScript instalado. No CI oficial, rodar `npm run test` (Vitest) e `npm run build` (TS + Vite). O teste offline NÃO substitui o Vitest, o build completo nem um playtest real.

## Pendências priorizadas

1. Certificar o percurso manual de entrar, falar e sair de ambos os imóveis; verificar se o avatar nunca fica preso e se missões 1–3 terminam.
2. Construir FSM serializável de missões com retry e checkpoint explícito (Fase 2).
3. Colisões de pedestres/veículos nos passeios e cruzamentos, com rotas mais inteligentes.
4. Perfil de FPS/draw calls e streaming por chunk antes de ampliar o mapa.
