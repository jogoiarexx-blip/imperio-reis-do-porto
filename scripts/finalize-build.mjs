import { readFileSync, renameSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const input = fileURLToPath(new URL('../dist/index.dev.html', import.meta.url));
const output = fileURLToPath(new URL('../dist/index.html', import.meta.url));
if (!existsSync(input)) throw new Error('Vite não produziu dist/index.dev.html.');
const html = readFileSync(input, 'utf8');
if (!html.includes('./assets/') || html.includes('/src/main.ts')) {
  throw new Error('Build inválido: referências de desenvolvimento presentes no HTML.');
}
renameSync(input, output);
console.log('GitHub Pages: dist/index.html compilado e validado.');
