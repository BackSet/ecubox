/**
 * Genera PNG de iconos PWA desde el monograma vectorial.
 * Ejecutar tras cambiar src/assets/brand/monograma_ecubox-light.svg
 */
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
// Debe usar <path> para la letra "e", no <text>: resvg no carga fuentes en CI/móvil.
const sourceSvg = path.join(root, 'src/assets/brand/monograma_ecubox-light.svg');
const outDir = path.join(root, 'public/icons');

const outputs = [
  { name: 'ecubox-monogram-192.png', size: 192 },
  { name: 'ecubox-monogram-512.png', size: 512 },
  { name: 'ecubox-monogram-180.png', size: 180 },
  // Maskable: icono al 80% centrado (zona segura Android)
  { name: 'ecubox-monogram-maskable-512.png', size: 512, maskable: true },
];

if (!fs.existsSync(sourceSvg)) {
  console.error('No se encontró:', sourceSvg);
  process.exit(1);
}

const sourceContent = fs.readFileSync(sourceSvg, 'utf8');
if (sourceContent.includes('<text')) {
  console.error('El monograma no debe usar <text> para PNG PWA. Usa <path> (ver monograma-letter-e.path.svg).');
  process.exit(1);
}
if (!sourceContent.includes('<path')) {
  console.error('El monograma debe incluir un <path> con la letra e.');
  process.exit(1);
}

fs.mkdirSync(outDir, { recursive: true });

function runResvg(inputPath, outPath, size) {
  const npx = process.platform === 'win32' ? 'npx.cmd' : 'npx';
  execFileSync(
    npx,
    ['--yes', '@resvg/resvg-js-cli', '--fit-width', String(size), '--text-rendering', '1', inputPath, outPath],
    { cwd: root, stdio: 'inherit', shell: process.platform === 'win32' }
  );
}

function renderPng(svgPath, outPath, size, maskable) {
  if (maskable) {
    const padded = path.join(outDir, '_maskable-temp.svg');
    const safe = Math.round(size * 0.8);
    const offset = Math.round((size - safe) / 2);
    const inner = fs.readFileSync(svgPath, 'utf8');
    const body = inner.replace(/^<svg[^>]*>/, '').replace(/<\/svg>\s*$/, '');
    const wrapped = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <g transform="translate(${offset} ${offset}) scale(${safe / 64})">
    ${body}
  </g>
</svg>`;
    fs.writeFileSync(padded, wrapped);
    runResvg(padded, outPath, size);
    fs.unlinkSync(padded);
  } else {
    runResvg(svgPath, outPath, size);
  }
}

for (const { name, size, maskable } of outputs) {
  const outPath = path.join(outDir, name);
  console.log('Generando', name);
  renderPng(sourceSvg, outPath, size, !!maskable);
}

// Compatibilidad con rutas antiguas (evita 404 si algo aún las referencia)
const legacy = [
  ['ecubox-monogram-192.png', 'pwa-icon-192.png'],
  ['ecubox-monogram-512.png', 'pwa-icon-512.png'],
  ['ecubox-monogram-180.png', 'apple-touch-icon.png'],
];
for (const [src, dest] of legacy) {
  fs.copyFileSync(path.join(outDir, src), path.join(root, 'public', dest));
}

console.log('Iconos PWA generados en public/icons/');
