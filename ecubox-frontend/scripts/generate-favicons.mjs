/**
 * Regenera public/favicon*.svg desde brand-glyphs.mjs (misma "e" que el monograma en UI).
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { E_PATH, E_TRANSFORM, GRAD_DARK, GRAD_LIGHT } from './brand-glyphs.mjs';

const publicDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', 'public');

function buildFavicon({ id, stops, filename }) {
  const [c0, c1] = stops;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 100 100" fill="none" role="img" aria-label="ECUBOX">
  <defs>
    <linearGradient id="${id}" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="${c0}"/>
      <stop offset="1" stop-color="${c1}"/>
    </linearGradient>
  </defs>
  <rect x="0" y="0" width="100" height="100" rx="24" fill="url(#${id})"/>
  <path d="${E_PATH}" fill="#FFFFFF" transform="${E_TRANSFORM}"/>
</svg>
`;
}

const files = [
  { id: 'ecbFavicon', stops: GRAD_LIGHT, filename: 'favicon.svg' },
  { id: 'ecbFaviconLight', stops: GRAD_LIGHT, filename: 'favicon-light.svg' },
  { id: 'ecbFaviconDark', stops: GRAD_DARK, filename: 'favicon-dark.svg' },
];

for (const spec of files) {
  const out = path.join(publicDir, spec.filename);
  fs.writeFileSync(out, buildFavicon(spec));
  console.log('Escrito', spec.filename);
}
