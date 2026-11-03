# REV2 — Correção de deploy do GitHub Pages

**Evidência:** captura de tela de 2026-11-03 mostrando HTML sem CSS e 404 em `main.ts`.
Verificação: `pages build and deployment` Jekyll concluiu depois da ação de deploy de Vite,
e o `index.html` da branch apontava para `/src/main.ts`. O `dist/index.html` do artefato
`github-pages` tinha referências relativas corretas para `./assets/index-*.js` e `./assets/index-*.css`.

**Mudanças:**
- Fonte HTML movida para `index.dev.html`, com build de Vite apontando para ela.
- Pós-build renomeia `dist/index.dev.html` para `dist/index.html`, validando referências.
- Workflow sincroniza o build compilado com a raiz da `main` para permitir Jekyll branch Pages
  sem servir TypeScript diretamente; mantém deploy de artefato `dist/` quando Pages usa Actions.
- `.nojekyll` impede processamento extra da saída estática.

**QA exigido:** testes Node/Vitest + build no Actions; validar a branch após o job
para confirmar que `index.html` referencia `./assets/` e que o pacote JS está presente.
A confirmação de execução 3D no navegador deve ser registrada separadamente.
