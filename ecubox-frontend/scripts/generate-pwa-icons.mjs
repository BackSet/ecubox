/**
 * Genera PNG de iconos PWA desde el monograma maestro en PNG.
 * Fuente: src/assets/brand/monograma_ecubox.png
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const sourcePng = path.join(root, 'src/assets/brand/monograma_ecubox.png');
const outDir = path.join(root, 'public/icons');

const outputs = [
  { name: 'ecubox-monogram-192.png', size: 192 },
  { name: 'ecubox-monogram-512.png', size: 512 },
  { name: 'ecubox-monogram-180.png', size: 180 },
  { name: 'ecubox-monogram-maskable-512.png', size: 512, maskable: true },
];

if (!fs.existsSync(sourcePng)) {
  console.error('No se encontró el monograma PNG:', sourcePng);
  process.exit(1);
}

fs.mkdirSync(outDir, { recursive: true });

async function renderIcon({ name, size, maskable }) {
  const outPath = path.join(outDir, name);
  console.log('Generando', name);

  if (maskable) {
    const safe = Math.round(size * 0.8);
    const icon = await sharp(sourcePng).resize(safe, safe, { fit: 'contain' }).png().toBuffer();
    await sharp({
      create: {
        width: size,
        height: size,
        channels: 4,
        background: { r: 0, g: 0, b: 0, alpha: 0 },
      },
    })
      .composite([{ input: icon, gravity: 'center' }])
      .png()
      .toFile(outPath);
    return;
  }

  await sharp(sourcePng)
    .resize(size, size, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toFile(outPath);
}

for (const spec of outputs) {
  await renderIcon(spec);
}

const legacy = [
  ['ecubox-monogram-192.png', 'pwa-icon-192.png'],
  ['ecubox-monogram-512.png', 'pwa-icon-512.png'],
  ['ecubox-monogram-180.png', 'apple-touch-icon.png'],
];
for (const [src, dest] of legacy) {
  fs.copyFileSync(path.join(outDir, src), path.join(root, 'public', dest));
}

console.log('Iconos PWA generados desde', path.relative(root, sourcePng));
