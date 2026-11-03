# QA — REV1: estado persistente, interiores e narrativa

**Data:** 03/11/2026. **Escopo:** correções incrementais sobre a primeira publicação, sem expandir distritos.

## Antes (base 0.2.0)

- A compra de reforma podia ser repetida infinitamente: cada clique debitava R$ 300 e concedia reputação, sem registrar a reforma.
- A oficina não mudava visualmente, nem sua receita, após pagar pela obra.
- A missão 03 dependia de reformar a oficina **depois** de começar a missão, podendo bloquear o avanço caso ela já tivesse sido reformada.
- O diálogo de escolha Bellori podia conceder reputação ilimitada ao reentrar no bar.
- O automóvel não preservava posição e orientação em saves; ao carregar, reaparecia na posição anterior da sessão.
- Portas de interiores eram malhas imóveis sobre o vão; a navegação interna não barrava balcões nem prateleiras.
- Build e testes iniciais passaram no GitHub Actions, mas `actions/configure-pages@v5` falhou ao tentar criar o site com `enablement: true` (permissão insuficiente).

## Depois — alterações realizadas

1. **Economia:** `renovateWorkshop` centraliza a compra (uma vez, R$ 300, +5 Valença), registrando o ID estável do imóvel; a produção horária passa de R$ 155 para R$ 225. A fachada recebe moldura, marquise e letreiro reformado.
2. **Narrativa:** `chooseBellori` impede múltiplas recompensas/penalidades e persiste a decisão; a missão 03 reconhece reformas adquiridas antecipadamente.
3. **Persistência:** `normalizeState` migra saves schema v1 antigos sem sobrescrever dinheiro/missão, valida as coordenadas e restaura posição/orientação do veículo, reforma e decisão.
4. **Interiores:** porta com dobradiça tem ângulo de abertura quando o jogador entra; balcão e prateleiras bloqueiam movimentação (volumes simplificados).
5. **Veículos:** saída verifica ao menos um ponto lateral livre; colisão usa envelope mais largo que o jogador e entrar esconde o avatar.
6. **GitHub Pages:** workflow deixou de solicitar criação administrativa do Pages. Ativar Pages em `Settings → Pages → Source: GitHub Actions` continua exigindo configuração do proprietário.

## Verificações e limites

- `npm run test`: executa testes de seed/topologia/missões/receita + novos cenários de reforma, economia, migrador, veículo, decisão única e conclusão da missão 03.
- `npm run build`: executa validação de TypeScript e compilação com Vite.
- Os testes de navegador, a certificação de colisões reais em circulação, a direção humana e a disponibilidade do GitHub Pages devem ser avaliados separadamente. Não declarar esses itens como aprovados apenas por testes unitários.

## Pendente para a REV2

- Interiores com cômodos verdadeiros, portas animadas e saídas com transição física sem teleporte.
- Mapa com ruas mais elaboradas, cruzamentos, fachadas menos repetitivas e o trecho de ligação ao Velho Porto.
- Testes automatizados de playtest em Chromium com captura de console/FPS e rotas controladas.
- Pedestres e tráfego com cruzamentos, semáforos e colisão entre entidades.
- Combate, perseguição, história/cutscenes e facções completas.
