/**
 * Genera los PNG de iconos PWA (y favicons legacy) a partir del glifo
 * vectorial "e" del monograma ECUBOX. Sin dependencias de PNG maestro:
 * el monograma se compone como SVG y se rasteriza con sharp al tamaño exacto.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const outDir = path.join(root, 'public/icons');
const publicDir = path.join(root, 'public');

// Glifo "e" de Manrope ExtraBold (800), vectorizado, centrado en lienzo 100x100.
const E_PATH =
  'M20.8 1.28Q16.32 1.28 12.864 -0.256Q9.408 -1.792 7.039999999999999 -4.416Q4.672 -7.04 3.424 -10.304Q2.176 -13.568 2.176 -17.024V-18.304000000000002Q2.176 -21.888 3.424 -25.184Q4.672 -28.48 7.007999999999999 -31.04Q9.344 -33.6 12.736 -35.104Q16.128 -36.608000000000004 20.416 -36.608000000000004Q26.112000000000002 -36.608000000000004 30.080000000000002 -34.048Q34.048 -31.488 36.16 -27.296Q38.272 -23.104 38.272 -18.176000000000002V-14.464H7.04V-20.736H31.552L27.52 -17.92Q27.52 -20.928 26.72 -23.008000000000003Q25.92 -25.088 24.352 -26.176000000000002Q22.784 -27.264 20.416 -27.264Q18.112000000000002 -27.264 16.416 -26.208Q14.72 -25.152 13.824000000000002 -23.008000000000003Q12.928 -20.864 12.928 -17.6Q12.928 -14.656 13.760000000000002 -12.512Q14.592 -10.368 16.32 -9.216000000000001Q18.048000000000002 -8.064 20.8 -8.064Q23.232 -8.064 24.8 -8.896Q26.368000000000002 -9.728 27.008 -11.136000000000001H37.632Q36.864000000000004 -7.5520000000000005 34.592 -4.736000000000001Q32.32 -1.92 28.832 -0.31999999999999995Q25.344 1.28 20.8 1.28Z';
const E_TRANSFORM = 'translate(29.776 67.664)';

// Degradado de marca (violeta-300 -> violeta-700), mismo que el monograma claro.
const GRAD = ['#8B6CFF', '#3E27A8'];

/**
 * Construye el SVG del icono al tamaño px solicitado para un rasterizado nítido.
 * @param {number} size  lado en px
 * @param {number} rx    radio de esquina en unidades del viewBox 100 (0 = cuadrado a sangre)
 * @param {number} eScale escala del glifo respecto al centro (zona segura maskable)
 */
function buildSvg(size, rx, eScale = 1) {
  const [c0, c1] = GRAD;
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

// any: squircle a sangre (esquinas redondeadas ~22%)
await render(192, 22, 1, 'ecubox-monogram-192.png');
await render(512, 22, 1, 'ecubox-monogram-512.png');
// apple-touch: cuadrado a sangre, iOS aplica su propia máscara redondeada
await render(180, 0, 1, 'ecubox-monogram-180.png');
// maskable: fondo a sangre + glifo reducido dentro de la zona segura
await render(512, 0, 0.88, 'ecubox-monogram-maskable-512.png');

// Copias legacy referenciadas por index.html / manifest
const legacy = [
  ['ecubox-monogram-192.png', 'pwa-icon-192.png'],
  ['ecubox-monogram-512.png', 'pwa-icon-512.png'],
  ['ecubox-monogram-180.png', 'apple-touch-icon.png'],
];
for (const [src, dest] of legacy) {
  fs.copyFileSync(path.join(outDir, src), path.join(publicDir, dest));
}

console.log('Iconos PWA generados desde el glifo vectorial ECUBOX');
