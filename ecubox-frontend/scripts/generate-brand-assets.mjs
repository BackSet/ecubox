/**
 * Genera los lockups de marca ECUBOX desde la fuente única brand-glyphs.mjs:
 *   - src/assets/brand/ecubox-symbol-{light,dark}.svg        (isotipo bare)
 *   - src/assets/brand/ecubox-logo-horizontal-{light,dark}.svg
 *   - src/assets/brand/ecubox-logo-stacked-{light,dark}.svg
 *   - public/brand-pattern.svg                               (patrón decorativo)
 *
 * Logo monocromo (símbolo + wordmark en una sola tinta), según la guía de marca:
 * «light» = para fondos claros (tinta carbón); «dark» = para fondos oscuros
 * (tinta gris claro). El badge del icono de la app (carbón) lo producen
 * generate-favicons.mjs / generate-pwa-icons.mjs. Todo es SVG vectorial.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import {
  symbolSvg,
  SYMBOL_VIEWBOX,
  SYMBOL_D1,
  SYMBOL_D2,
  WORDMARK_VIEWBOX,
  WORDMARK_ECU_PATH,
  WORDMARK_BOX_PATH,
  INK_LIGHT,
  INK_DARK,
} from './brand-glyphs.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const brandDir = path.join(root, 'src/assets/brand');
const pdfDir = path.join(root, 'src/lib/pdf');
const publicDir = path.join(root, 'public');

const TONES = { light: INK_LIGHT, dark: INK_DARK };

/** Wordmark «ECUBOX» monocromo. */
function wordmark(ink) {
  return `<path d="${WORDMARK_ECU_PATH}" fill="${ink}"/>
    <path d="${WORDMARK_BOX_PATH}" fill="${ink}"/>`;
}

/** Isotipo bare: símbolo «ec» centrado en lienzo cuadrado (sin distorsión). */
function buildSymbol(ink) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 100 100" fill="none" role="img" aria-label="ECUBOX">
  ${symbolSvg(ink, { x: 6, y: 6, width: 88, height: 88 })}
</svg>
`;
}

function buildHorizontal(ink) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="210" height="56" viewBox="0 0 210 56" fill="none" role="img" aria-label="ECUBOX">
  ${symbolSvg(ink, { x: 0, y: 4, width: 92, height: 48 })}
  <svg x="100" y="17" width="105" height="23" viewBox="${WORDMARK_VIEWBOX}">
    ${wordmark(ink)}
  </svg>
</svg>
`;
}

function buildStacked(ink) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="168" height="110" viewBox="0 0 168 110" fill="none" role="img" aria-label="ECUBOX">
  ${symbolSvg(ink, { x: 34, y: 0, width: 100, height: 56 })}
  <svg x="31.5" y="74" width="105" height="23" viewBox="${WORDMARK_VIEWBOX}">
    ${wordmark(ink)}
  </svg>
</svg>
`;
}

/** Patrón decorativo: monograma «ec» en grafito tenue, para fondos de marca. */
function patternTile(x, y) {
  return `<svg x="${x}" y="${y}" width="56" height="56" viewBox="${SYMBOL_VIEWBOX}" preserveAspectRatio="xMidYMid meet"><path d="${SYMBOL_D1}" fill="#2A2A30" fill-opacity="0.10"/><path d="${SYMBOL_D2}" fill="#2A2A30" fill-opacity="0.10"/></svg>`;
}
function buildPattern() {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="160" height="160" viewBox="0 0 160 160" fill="none">
  <defs>
    <pattern id="ecbPattern" width="80" height="80" patternUnits="userSpaceOnUse">
      ${patternTile(12, 12)}
      ${patternTile(-28, 52)}
      ${patternTile(52, 52)}
    </pattern>
  </defs>
  <rect width="160" height="160" fill="url(#ecbPattern)"/>
</svg>
`;
}

fs.mkdirSync(brandDir, { recursive: true });
fs.mkdirSync(pdfDir, { recursive: true });

const horizontalSvgs = {};

for (const [tone, ink] of Object.entries(TONES)) {
  const files = [
    [`ecubox-symbol-${tone}.svg`, buildSymbol(ink)],
    [`ecubox-logo-horizontal-${tone}.svg`, buildHorizontal(ink)],
    [`ecubox-logo-stacked-${tone}.svg`, buildStacked(ink)],
  ];
  for (const [name, svg] of files) {
    fs.writeFileSync(path.join(brandDir, name), svg);
    console.log('Escrito', name);
    if (name.startsWith('ecubox-logo-horizontal-')) {
      horizontalSvgs[tone] = svg;
    }
  }
}

fs.writeFileSync(path.join(publicDir, 'brand-pattern.svg'), buildPattern());
console.log('Escrito brand-pattern.svg');

const pdfLogoData = {};
for (const [tone, svg] of Object.entries(horizontalSvgs)) {
  const png = await sharp(Buffer.from(svg)).resize(420, 112).png().toBuffer();
  pdfLogoData[tone] = `data:image/png;base64,${png.toString('base64')}`;
}

fs.writeFileSync(
  path.join(pdfDir, 'generated-brand-logo-data.ts'),
  `// Generado por scripts/generate-brand-assets.mjs. No editar a mano.\n` +
    `// Fuente oficial: src/assets/brand/ecubox-logo-horizontal-{light,dark}.svg\n\n` +
    `export const ECUBOX_LOGO_HORIZONTAL_LIGHT_DATA_URL = ${JSON.stringify(pdfLogoData.light)};\n` +
    `export const ECUBOX_LOGO_HORIZONTAL_DARK_DATA_URL = ${JSON.stringify(pdfLogoData.dark)};\n`,
);
console.log('Escrito generated-brand-logo-data.ts');
console.log('Assets de marca generados desde brand-glyphs.mjs');
