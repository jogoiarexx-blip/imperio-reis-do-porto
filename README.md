# IMPÉRIO — Reis de Porto Vesper

Protótipo 3D original de mundo aberto em **Porto Vesper, 1988**, com **Dante Valença** como protagonista. Base técnica reconstruída a partir do GDD e do código exportado em PDF da conversa do Gemini. O PDF estava parcialmente cortado nas linhas de código, por isso esta publicação contém uma versão fonte organizada e corrigida para uso no GitHub, **não uma transcrição literal do PDF**.

## REV1 — Continuidade (03/11/2026)

- Reforma da Oficina Valença agora custa R$ 300 **apenas uma vez**, altera a fachada e aumenta a receita por hora de R$ 155 para R$ 225; o efeito persiste no save.
- Diálogo Bellori tem consequência **única e persistente**, sem explorar reputação ilimitada.
- Saves antigos são migrados para preservar campanha/dinheiro e acrescentar estado de reforma, decisão e posição do carro.
- Portas de imóveis acessíveis abrem na dobradiça durante a visita; interiores bloqueiam movimento em balcões/prateleiras.
- Saída do carro exige espaço lateral; a colisão do carro tem envelope maior.
- Correção do workflow de GitHub Pages para não solicitar configuração administrativa sem permissão.

Veja [`docs/QA_REV1_PERSISTENCIA.md`](docs/QA_REV1_PERSISTENCIA.md) para as evidências e limitações.

## Executar

Requer Node.js 20+. Execute `npm install`, depois `npm run dev`. Use `npm run test` para verificar o gerador urbano, a economia e a persistência; `npm run build` gera `dist/`.

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

## Correção da publicação estática (REV2)

O GitHub Pages estava servindo o HTML de desenvolvimento, que referencia `/src/main.ts`,
porque a publicação Jekyll da branch `main` era executada depois do deploy Vite.
Agora `index.dev.html` é o ponto de entrada editável usado pelo Vite,
enquanto `index.html` na raiz é **sempre o HTML compilado** com caminhos relativos `./assets/`.
`npm run build` cria `dist/index.html` após validar a saída. O workflow publica `dist/`
e também sincroniza `index.html` e `assets/` no branch `main`, mantendo compatibilidade
com Pages configurado para **GitHub Actions** ou **Deploy from a branch / main / (root)**.

Durante desenvolvimento, abra `/index.dev.html` (o comando `npm run dev` já o abre).
Não edite diretamente `index.html`: ele é regenerado a partir de `index.dev.html`.
Caso o build falhe, o workflow não substitui a versão estável em `main`.

**Teste de produção:** acesse a URL do Pages, abra o console do navegador,
confirme ausência de requisição para `/src/main.ts` e presença de recursos em `./assets/`.
Os testes automatizados não substituem esse teste visual no navegador.


## REV3 — Vertical slice de Santa Ângela (Fases 1 e 2 do GDD)

- **Acesso por fachada correta:** portas só respondem ao jogador na calçada correspondente; a saída de interiores exige proximidade da porta. A transição por `E` cruza apenas o vão do imóvel, sem salto entre ambientes.
- **NPCs de campanha:** Helena Valença dentro da oficina e Rafael dentro do bar. As três etapas do prólogo agora avançam ao **conversar** com os personagens, não simplesmente atravessando a porta.
- **Vitrines `shell` reais:** profundidade de 4,2 metros, vidros, teto, piso, parede posterior e duas tipologias de exposição; imóveis `none` continuam inacessíveis.
- **Ambientes distintos:** oficina com elevador e armários; bar com mesas e estantes, todos com volumes simplificados de colisão.
- **Saves dentro de imóveis:** estado de interior é recuperado pelo volume do imóvel ao carregar, inclusive para partidas REV1.
- **Inspeção F3:** segure `ALT` e clique em um prédio para visualizar os IDs da rua, quadra, lote e categoria do interior.
- **Cidade:** vitrines laterais para esquinas, faixas de travessia nos cruzamentos e validador de orientação das entradas.

**Verificações:** `npm run test`, `npm run qa:sanity`, `npm run build` e leitura do relatório `docs/QA_EVIDENCIAS.md`.
**Limites:** interiores multinível, diálogos com animações, NPCs com rotina diária e toda a campanha permanecem para revisões posteriores. O prólogo ainda precisa de certificação de percurso humano no navegador.

## REV4 — Missões 1–3 e checkpoints

A campanha inicial agora registra estado ativo/falho/concluído, checkpoint e contador de retries. Na missão **A conta vence**, reforme a oficina, retire os documentos com Helena e entregue-os ao Bar Atlântico antes de 240 segundos de simulação. Se o prazo expirar, **R** ou o botão **REPETIR** recomeça o objetivo corrente sem remover reformas ou duplicar recompensas. Pausas interrompem o contador. Saves da REV3 são migrados para o novo fluxo; um save anterior válido é guardado como backup local. Consulte `docs/QA_REV4_MISSOES.md` para cobertura e pendências.

## REV5 — Proteção do progresso

A partida é salva automaticamente a cada 15 segundos de jogo ativo e ao colocar a página em segundo plano. Caso o armazenamento falhe, aparece um aviso. Saves com dados inválidos de missão, posição, saúde, dinheiro, reputação ou pressão policial são rejeitados; um arquivo principal danificado não substitui o backup válido. O salvamento continua local ao navegador e não é sincronizado entre aparelhos.

A campanha completa, os distritos adicionais, combate funcional e os demais sistemas previstos no GDD continuam em desenvolvimento. Esta revisão não os implementa nem certifica um percurso visual completo no navegador.
