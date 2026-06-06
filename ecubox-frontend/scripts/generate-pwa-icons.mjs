/**
 * Genera los PNG de iconos PWA a partir del mismo glifo que favicon.svg (brand-glyphs.mjs).
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import { E_PATH, E_TRANSFORM, GRAD_LIGHT } from './brand-glyphs.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const outDir = path.join(root, 'public/icons');

/**
 * @param {number} size
 * @param {number} rx
 * @param {number} eScale
 */
function buildSvg(size, rx, eScale = 1) {
  const [c0, c1] = GRAD_LIGHT;
  const glyph =
    eScale === 1
      ? `<path d="${E_PATH}" fill="#FFFFFF" transform="${E_TRANSFORM}"/>`
      : `<g transform="translate(50 50) scale(${eScale}) translate(-50 -50)"><path d="${E_PATH}" fill="#FFFFFF" transform="${E_TRANSFORM}"/></g>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 100 100" fill="none">
  <defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${c0}"/><stop offset="1" stop-color="${c1}"/></linearGradient></defs>
  <rect x="0" y="0" width="100" height="100" rx="${rx}" fill="url(#g)"/>
  ${glyph}
</svg>`;
}

async function render(size, rx, eScale, name) {
  const svg = buildSvg(size, rx, eScale);
  const outPath = path.join(outDir, name);
  console.log('Generando', name);
  await sharp(Buffer.from(svg)).png().toFile(outPath);
}

fs.mkdirSync(outDir, { recursive: true });

await render(192, 22, 1, 'ecubox-monogram-192.png');
await render(512, 22, 1, 'ecubox-monogram-512.png');
await render(180, 0, 1, 'ecubox-monogram-180.png');
await render(512, 0, 0.88, 'ecubox-monogram-maskable-512.png');

console.log('Iconos PWA generados desde brand-glyphs.mjs');
