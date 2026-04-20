#!/usr/bin/env node
/* eslint-disable */
/**
 * Lint de nomenclatura canónica.
 *
 * Verifica que el código fuente del frontend NO use términos legacy
 * fuera de las excepciones explícitas (allowlist). El glosario canónico
 * vive en `docs/nomenclatura.md`.
 *
 * Uso:
 *   node scripts/lint-nomenclatura.mjs                # exit 1 si hay violaciones
 *   node scripts/lint-nomenclatura.mjs --report       # imprime todo, exit 0
 */

import { readFileSync, statSync } from 'node:fs';
import { readdir } from 'node:fs/promises';
import { join, relative, sep } from 'node:path';

const ROOT = new URL('../src/', import.meta.url).pathname.replace(/^\/(?=[A-Za-z]:)/, '');
const REPO_ROOT = new URL('../', import.meta.url).pathname.replace(/^\/(?=[A-Za-z]:)/, '');

/**
 * Términos prohibidos (pattern + mensaje + reemplazo sugerido).
 * Solo se busca en strings entre comillas / backticks o en JSX text.
 */
const RULES = [
  { pat: /\bDestinatarios?\b/g, fix: 'Consignatario(s)', msg: 'Usa "Consignatario(s)" en copy UI.' },
  { pat: /\bdestinatarios?\b/g, fix: 'consignatario(s)', msg: 'Usa "consignatario(s)" en copy UI.' },
  { pat: /\bDistribuidor(?:es)?\b/g, fix: 'Courier(s) de entrega', msg: 'Usa "Courier(s) de entrega".' },
  { pat: /\bdistribuidor(?:es)?\b/g, fix: 'courier(s) de entrega', msg: 'Usa "courier(s) de entrega".' },
  { pat: /Cargar pesos?/g, fix: 'Pesaje', msg: 'Usa "Pesaje" o "Registrar peso".' },
  { pat: /Oficina en USA/g, fix: 'Mi casillero', msg: 'Usa "Casillero" / "Mi casillero".' },
  { pat: /Agencia EEUU/g, fix: 'Casillero', msg: 'Usa "Casillero".' },
  { pat: /Agencias asociadas/g, fix: 'Puntos de entrega', msg: 'Usa "Puntos de entrega".' },
  { pat: /\bDESTINATARIOS_(READ|CREATE|UPDATE|DELETE|OPERARIO)\b/g, fix: 'CONSIGNATARIOS_$1', msg: 'Permiso renombrado a CONSIGNATARIOS_*.' },
  { pat: /\bDISTRIBUIDORES_(READ|WRITE)\b/g, fix: 'COURIERS_ENTREGA_$1', msg: 'Permiso renombrado a COURIERS_ENTREGA_*.' },
  { pat: /\bAGENCIAS_DISTRIBUIDOR_(READ|WRITE)\b/g, fix: 'PUNTOS_ENTREGA_$1', msg: 'Permiso renombrado a PUNTOS_ENTREGA_*.' },
];

/**
 * Allowlist: rutas/relativas o regex de archivos cuyos hits no rompen el lint.
 *
 * Justificación documentada en cada caso. Estos archivos contienen:
 *   - Identificadores legacy de tipos/DTOs alineados con la BD (deuda técnica).
 *   - Redirects desde URLs antiguas para no romper bookmarks.
 *   - Nombres de campos que el backend aún expone con nomenclatura legacy.
 */
const ALLOWLIST = [
  /[\\/]types[\\/]/,                      // tipos espejo del backend con nombres legacy
  /[\\/]lib[\\/]api[\\/]/,                // services pueden mencionar campos legacy
  /[\\/]routes[\\/]router\.tsx$/,         // contiene redirects desde URLs legacy
  /[\\/]hooks[\\/]/,                      // query keys y hooks pueden tener nombres legacy
  /[\\/]pages[\\/]tracking[\\/]/,         // public tracking usa label "Destinatario" para el cliente final
  /[\\/]data[\\/]/,                       // catálogos de provincias/cantones
];

const EXCLUDED_DIRS = new Set(['node_modules', 'dist', 'build', '.git']);

async function walk(dir, files = []) {
  const entries = await readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      if (EXCLUDED_DIRS.has(entry.name)) continue;
      await walk(full, files);
    } else if (/\.(ts|tsx)$/.test(entry.name)) {
      files.push(full);
    }
  }
  return files;
}

function isInString(line, idx) {
  // Heurística: el carácter está dentro de comillas " ' ` o tras un > de JSX.
  // Cuenta comillas a la izquierda; si es impar, está dentro de string.
  const left = line.slice(0, idx);
  const dq = (left.match(/(?<!\\)"/g) || []).length;
  const sq = (left.match(/(?<!\\)'/g) || []).length;
  const bq = (left.match(/(?<!\\)`/g) || []).length;
  if (dq % 2 === 1 || sq % 2 === 1 || bq % 2 === 1) return true;
  // JSX text: hay > antes y < después (mismo línea)
  const lastGt = left.lastIndexOf('>');
  const lastLt = left.lastIndexOf('<');
  if (lastGt > lastLt) return true;
  return false;
}

function checkFile(file) {
  const rel = relative(REPO_ROOT, file).split(sep).join('/');
  const allowed = ALLOWLIST.some((re) => re.test(file));
  if (allowed) return [];
  const text = readFileSync(file, 'utf8');
  const lines = text.split(/\r?\n/);
  const violations = [];
  lines.forEach((line, lineIdx) => {
    for (const rule of RULES) {
      rule.pat.lastIndex = 0;
      let m;
      while ((m = rule.pat.exec(line)) !== null) {
        if (!isInString(line, m.index)) continue;
        violations.push({
          file: rel,
          line: lineIdx + 1,
          col: m.index + 1,
          term: m[0],
          fix: rule.fix,
          msg: rule.msg,
        });
      }
    }
  });
  return violations;
}

async function main() {
  const reportOnly = process.argv.includes('--report');
  let stat;
  try { stat = statSync(ROOT); } catch { stat = null; }
  if (!stat || !stat.isDirectory()) {
    console.error(`No se encontró el directorio fuente: ${ROOT}`);
    process.exit(2);
  }
  const files = await walk(ROOT);
  const all = [];
  for (const f of files) all.push(...checkFile(f));

  if (all.length === 0) {
    console.log('OK Nomenclatura: sin violaciones del glosario canónico.');
    process.exit(0);
  }

  console.log(`Violaciones de nomenclatura: ${all.length}`);
  for (const v of all) {
    console.log(`  ${v.file}:${v.line}:${v.col}  "${v.term}" -> ${v.fix}   (${v.msg})`);
  }
  console.log('');
  console.log('Glosario canónico: docs/nomenclatura.md');
  console.log('Si una mención es legítima (vista cliente, dual, deuda técnica), agrega el archivo a ALLOWLIST en scripts/lint-nomenclatura.mjs.');
  process.exit(reportOnly ? 0 : 1);
}

main().catch((err) => {
  console.error(err);
  process.exit(2);
});
