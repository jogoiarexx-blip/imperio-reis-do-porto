# QA — Estado inicial antes das melhorias

**Data:** 2026-11-03  
**Origem:** GDD Gemini v1.0 + exportação PDF com duas iterações de código.  
**Repositório na inspeção inicial:** público e vazio (`main`, tamanho 0).  
**Estratégia:** reconstruir código publicável, preservar o GDD e documentar os limites, sem afirmar que todos os sistemas descritos pelo Gemini já estão certificados.

## Requisitos implementados na base

- Topologia determinística de quatro quadras, 28 lotes/prédios e IDs estáveis.
- Ausência de interpenetração geométrica de edifícios no validador.
- Oficina e Bar com `full`; alguns com `shell`; os demais `none`.
- Movimento de personagem, veículo simplificado, tráfego e NPCs em trajetos fixos.
- Interação E, gestão inicial, três etapas do prólogo, save em localStorage, relógio e HUD.
- Build Vite com publicação prevista em Actions.

## Ainda não certificado / pendente

- Jogabilidade humana completa em Chromium desktop e responsividade móvel.
- Navegação avançada de NPCs, perseguição inteligente, semáforos e trânsito reativo.
- Interior multinível, interiores de missão além dos dois marcos iniciais.
- Sistema completo de combate, dano, munição, cobertura contextual e IA policial.
- Física de automóveis, colisão fina de portas/escadas, diálogo com dublagem.
- Campanha completa de cinco atos e demais distritos de Porto Vesper.
- Otimização perfilada de muitos quarteirões, assets GLB e medições em hardware fraco.

## Testes de código

`npm run test` verifica seed, 4 quadras, 28 edifícios, 2 interiores, marcos narrativos e proteção contra ganho duplo no mesmo ciclo. **Testes unitários não substituem um playtest real**.
