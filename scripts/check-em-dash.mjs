/**
 * Suzi Design — Em-dash check (C8 / B4)
 *
 * Locked Rule C8 + Brand B4: TR metinlerde em-dash (—) YASAK.
 * Build pre-flight: src/pages, src/components, src/layouts içinde TR locale dosyalarında em-dash arar.
 *
 * EN dosyalarda em-dash serbest (C8 sadece TR için).
 * Kullanım: npm run check-em-dash
 */

import { readdir, readFile, stat } from 'node:fs/promises';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');
const SRC  = resolve(ROOT, 'src');

const EM_DASH = '—'; // —
const EN_DIR_PATTERN = /[\\/]en[\\/]/;
const ALLOWED_FILE_NAMES = new Set([]); // explicit allow-list (rare exceptions)

async function walk(dir, results = []) {
  const entries = await readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      await walk(full, results);
    } else if (/\.(astro|md|mdx|ts|tsx|js|jsx)$/.test(entry.name)) {
      results.push(full);
    }
  }
  return results;
}

async function main() {
  const files = await walk(SRC);
  const offenders = [];

  for (const file of files) {
    if (EN_DIR_PATTERN.test(file)) continue;            // EN sayfaları muaf
    if (ALLOWED_FILE_NAMES.has(file)) continue;

    const content = await readFile(file, 'utf8');
    const lines = content.split('\n');
    lines.forEach((line, idx) => {
      const at = line.indexOf(EM_DASH);
      if (at !== -1) {
        offenders.push({
          file: file.replace(ROOT, '.'),
          line: idx + 1,
          col: at + 1,
          excerpt: line.trim().slice(0, 120),
        });
      }
    });
  }

  if (offenders.length === 0) {
    console.log('[em-dash] Temiz — em-dash bulunamadı (TR dosyalarda).');
    return;
  }

  console.error(`[em-dash] HATA: TR dosyalarda ${offenders.length} em-dash bulundu (C8 / B4 ihlali):\n`);
  for (const o of offenders) {
    console.error(`  ${o.file}:${o.line}:${o.col}`);
    console.error(`    ${o.excerpt}`);
  }
  console.error('\nDüzeltme: em-dash (—) yerine noktalı virgül (;), virgül (,), parantez () veya yeni cümle kullanın.');
  process.exit(1);
}

main().catch(err => {
  console.error('Fatal:', err);
  process.exit(1);
});
