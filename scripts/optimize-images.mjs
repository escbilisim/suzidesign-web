/**
 * Suzi Design — Image optimize pipeline (sharp)
 *
 * Locked Rule C1: ham imaj → WebP + tam-boyut varyantlar
 * Locked Rule C2: CSS scale ile imaj küçültme YASAK — her kullanım boyutu için ayrı varyant
 *
 * Kullanım:
 *   npm run optimize-images
 *
 * Input:  Website/public/images/_source/   (gitignore'da olabilir; raw imajlar)
 * Output: Website/public/images/            (optimize WebP varyantları)
 *
 * Ek üretim: favicon-set (16/32/48 ICO + 192/512 PNG) Logo'dan
 */

import sharp from 'sharp';
import { mkdir, copyFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT  = resolve(__dirname, '..');
const SRC   = resolve(ROOT, 'public/images');
const OUT   = resolve(ROOT, 'public/images');

/**
 * Her imaj için: hangi widths üretilecek?
 * Mevcut public/images/'daki dosyalardan WebP varyantları üretiyoruz.
 */
const VARIANTS = {
  // Logo — header (64-80px desktop), retina için 2x, favicon için 128/256
  'logo.png': {
    widths: [80, 128, 160, 192, 256, 512],
    fit: 'contain', // logo daire içinde, kırpılmamalı
    background: { r: 0, g: 0, b: 0, alpha: 0 },
  },

  // Atölye - /hakkimizda hero background, ortalama 1200-1600 wide
  'atolye.webp': {
    widths: [800, 1200, 1600, 2000],
    fit: 'cover',
    reEncode: true, // mevcut .webp'yi yeniden encode et (boyut düşürmek için)
  },

  // Hero - anasayfa full-bleed background, geniş aspect ratio
  'hero.webp': {
    widths: [800, 1200, 1600, 2000, 2400],
    fit: 'cover',
    reEncode: true,
  },

  // Ürün örnekleri — anasayfa preview grid (300-600w) + retina
  'elbise1.png': { widths: [400, 600, 800, 1200], fit: 'cover' },
  'elbise2.png': { widths: [400, 600, 800, 1200], fit: 'cover' },
  'elbise3.png': { widths: [400, 600, 800, 1200], fit: 'cover' },
  'elbise4.png': { widths: [400, 600, 800, 1200], fit: 'cover' },
};

const QUALITY = 80;

async function ensureDir(dir) {
  if (!existsSync(dir)) await mkdir(dir, { recursive: true });
}

async function optimize() {
  await ensureDir(OUT);

  const stats = { generated: 0, skipped: 0, errors: [] };

  for (const [filename, config] of Object.entries(VARIANTS)) {
    const inputPath = resolve(SRC, filename);
    if (!existsSync(inputPath)) {
      console.warn(`[skip] ${filename} bulunamadı (${inputPath})`);
      stats.skipped++;
      continue;
    }

    const baseName = filename.replace(/\.[^.]+$/, '');

    for (const w of config.widths) {
      const outPath = resolve(OUT, `${baseName}-${w}w.webp`);
      try {
        const pipeline = sharp(inputPath).resize({
          width: w,
          withoutEnlargement: true,
          fit: config.fit ?? 'inside',
          background: config.background,
        });

        await pipeline.webp({ quality: QUALITY }).toFile(outPath);
        console.log(`[ok]   ${baseName}-${w}w.webp`);
        stats.generated++;
      } catch (err) {
        console.error(`[err]  ${baseName}-${w}w.webp →`, err.message);
        stats.errors.push({ file: filename, width: w, error: err.message });
      }
    }
  }

  // Logo'dan favicon set üret
  console.log('\n--- Favicon set ---');
  const logoPath = resolve(SRC, 'logo.png');
  if (existsSync(logoPath)) {
    // icon-192.png + icon-512.png (PWA manifest için)
    for (const [size, name] of [[192, 'icon-192.png'], [512, 'icon-512.png']]) {
      const outPath = resolve(ROOT, 'public', name);
      await sharp(logoPath).resize({ width: size, fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } }).png().toFile(outPath);
      console.log(`[ok]   public/${name}`);
      stats.generated++;
    }

    // apple-touch-icon (180×180)
    const appleOut = resolve(ROOT, 'public/apple-touch-icon.png');
    await sharp(logoPath).resize({ width: 180, fit: 'contain', background: { r: 255, g: 255, b: 255, alpha: 1 } }).png().toFile(appleOut);
    console.log(`[ok]   public/apple-touch-icon.png`);
    stats.generated++;
  }

  // OG default image (1200x630, atolye background + brand overlay)
  console.log('\n--- OG default ---');
  const atolyeSrc = resolve(SRC, 'atolye-2000w.webp');
  if (existsSync(atolyeSrc)) {
    const ogOut = resolve(ROOT, 'public/og-default.png');

    // Brand text overlay (SVG composite)
    const overlaySvg = Buffer.from(`<svg width="1200" height="630" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="grad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stop-color="rgba(10,10,10,0.45)"/>
          <stop offset="0.6" stop-color="rgba(10,10,10,0.75)"/>
          <stop offset="1" stop-color="rgba(10,10,10,0.92)"/>
        </linearGradient>
      </defs>
      <rect width="1200" height="630" fill="url(#grad)"/>
      <text x="600" y="280" text-anchor="middle"
            font-family="Georgia, 'Cormorant Garamond', serif"
            font-size="84" font-style="italic" fill="#ffffff" font-weight="600">
        Suzi Design
      </text>
      <line x1="500" y1="320" x2="700" y2="320" stroke="#C9A87C" stroke-width="2"/>
      <text x="600" y="390" text-anchor="middle"
            font-family="Georgia, 'Cormorant Garamond', serif"
            font-size="48" font-style="italic" fill="#E5D4B5">
        Couture, kişiye özel.
      </text>
      <text x="600" y="500" text-anchor="middle"
            font-family="-apple-system, 'Segoe UI', Inter, sans-serif"
            font-size="22" letter-spacing="6" fill="rgba(255,255,255,0.72)">
        ATÖLYE  ·  KİŞİYE ÖZEL DİKİM  ·  PREMIUM KUMAŞ
      </text>
    </svg>`);

    await sharp(atolyeSrc)
      .resize({ width: 1200, height: 630, fit: 'cover', position: 'center' })
      .composite([{ input: overlaySvg, top: 0, left: 0 }])
      .png({ quality: 90 })
      .toFile(ogOut);

    console.log(`[ok]   public/og-default.png (1200x630)`);
    stats.generated++;
  } else {
    console.warn(`[skip] og-default: atolye-2000w.webp bulunamadı (önce ana varyantlar üretilmeli)`);
    stats.skipped++;
  }

  console.log('\n--- Summary ---');
  console.log(`Generated: ${stats.generated}`);
  console.log(`Skipped:   ${stats.skipped}`);
  console.log(`Errors:    ${stats.errors.length}`);
  if (stats.errors.length) {
    console.error('Errors:', stats.errors);
    process.exit(1);
  }
}

optimize().catch(err => {
  console.error('Fatal:', err);
  process.exit(1);
});
