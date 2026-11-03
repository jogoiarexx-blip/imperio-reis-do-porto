# IMPÉRIO — Reis de Porto Vesper

Protótipo 3D original de mundo aberto em **Porto Vesper, 1988**, com **Dante Valença** como protagonista. Base técnica reconstruída a partir do GDD e do código exportado em PDF da conversa do Gemini. O PDF estava parcialmente cortado nas linhas de código, por isso esta publicação contém uma versão fonte organizada e corrigida para uso no GitHub, **não uma transcrição literal do PDF**.

## Executar

Requer Node.js 20+. Execute `npm install`, depois `npm run dev`. Use `npm run test` para verificar o gerador urbano e a economia; `npm run build` gera `dist/`.

## O que existe nesta primeira publicação

- Santa Ângela em escala métrica, com **4 quadras e 28 imóveis contíguos**, criados com seed estável.
- Três categorias de edifício: `none` (fachada), `shell` (vitrine) e `full` (Oficina Valença e Bar Atlântico exploráveis).
- Movimentação em terceira pessoa, colisão simplificada de construções, câmera orbitável e veículo básico.
- Tráfego e pedestres em rotas predefinidas alinhadas às quadras; relógio e iluminação dia/noite.
- Três etapas narrativas iniciais, caixa do jogador, reputação simplificada, receita periódica e salvamento local.
- Interface de missão, gestão, mapa, FPS e menu de pausa; testes de seed, topologia e ciclos econômicos.

**Limites reais:** personagens e veículos são modelos procedurais provisórios. IA de combate, facções, diálogos cinematográficos, expansão dos distritos, missões complexas e interiores multinível ainda **não estão concluídos**. O tráfego atual usa rotas simples e não um sistema avançado de semáforos/pathfinding. Em esta versão, combate e cobertura são protótipos de interface, não um sistema completo.

## Controles

| Tecla | Ação |
|---|---|
| WASD / setas | Mover a pé ou dirigir |
| Mouse arrastando | Girar câmera |
| Shift | Correr / acelerar |
| E | Entrar e sair de prédio/veículo |
| I | Gestão do império |
| M | Mapa |
| Q | Cobertura experimental |
| L / SALVAR | Salvar no navegador |
| Esc | Pausar |

## Publicação

O workflow `.github/workflows/deploy.yml` realiza teste, build e publicação para GitHub Pages a cada commit na `main`. Em um repositório novo é necessário configurar **Settings → Pages → Build and deployment → GitHub Actions**, caso ainda não esteja selecionado.

## Documentação

O planejamento original integral, sem modificação, está em [`docs/GDD_IMPERIO_PORTO_VESPER.md`](docs/GDD_IMPERIO_PORTO_VESPER.md). Consulte [`docs/QA_ESTADO_INICIAL.md`](docs/QA_ESTADO_INICIAL.md) para o estado da publicação e limites de certificação.
