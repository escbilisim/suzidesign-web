# Suzi Design — Web

Couture & kişiye özel dikim. Static site built with Astro, hosted on Cloudflare Pages.

- **Live:** https://suzidesign.com
- **Stack:** Astro 6 (static) · Cloudflare Pages · Pages Functions · Resend · Curator.io
- **Languages:** TR (default) + EN (planned, `/en/` prefix)

## Quick start

```bash
npm install
npm run dev        # localhost:4321
```

## Scripts

| Command                     | What it does                                                |
|-----------------------------|-------------------------------------------------------------|
| `npm run dev`               | Astro dev server (localhost:4321)                           |
| `npm run build`             | Em-dash check (TR) + production build to `./dist/`          |
| `npm run build:unsafe`      | Build without em-dash check (debugging only)                |
| `npm run preview`           | Preview production build locally                            |
| `npm run optimize-images`   | Generate WebP variants + favicon set from `public/images/`  |
| `npm run check-em-dash`     | Scan TR sources for em-dash (—) — locked rule C8/B4         |

## Project structure

```
Website/
├── astro.config.mjs        # i18n (TR root, EN /en/), sitemap, site URL
├── public/
│   ├── fonts/              # Self-host woff2 (C5)
│   ├── images/             # Optimized WebP variants
│   ├── icon-192.png        # PWA icon
│   ├── icon-512.png
│   ├── apple-touch-icon.png
│   ├── site.webmanifest    # C6
│   ├── humans.txt          # C7
│   └── robots.txt
├── scripts/
│   ├── optimize-images.mjs # sharp-based variant generator
│   └── check-em-dash.mjs   # C8/B4 pre-flight
└── src/
    ├── styles/global.css   # Brand tokens
    ├── layouts/Layout.astro
    ├── components/
    │   ├── Header.astro    # Center logo + split nav + lang switcher
    │   └── Footer.astro    # 4-col, IG, NO mailto (C4)
    └── pages/
        ├── index.astro
        ├── hakkimizda.astro
        ├── urunler.astro
        ├── toptan.astro
        ├── sss.astro
        ├── iletisim.astro
        ├── gizlilik.astro
        ├── cerezler.astro
        └── 404.astro
```

## Locked rules

See workspace docs (`../docs/procedures/locked-rules.md`) for the master set. Brand-specific overrides (B1-B4) live in `../docs/Brainstorm.md` → "Locked Rules (Brand-Specific)".

Highlights enforced in this repo:

- **C4 — no mailto:** All contact via `/iletisim` form
- **C5 — self-host fonts:** No Google Fonts CDN
- **C6 — site.webmanifest** required
- **C7 — humans.txt** required
- **C8 / B4 — no em-dash in TR:** `npm run check-em-dash` enforces (build fails if violated)
- **B1 — no prices on site:** Couture made-to-measure, all CTAs go to form
- **B2 — Curator.io only on /urunler:** 3rd-party JS scoped to one page
- **T1 — img width + height** required for CLS=0

## Deploy

GitHub push → Cloudflare Pages auto-deploys main branch.

Push is **user-initiated** (locked rule O2). Claude does not push.

## Environment variables (CF Pages)

Set in **CF Dashboard → suzidesign-web project → Settings → Environment variables**.
Add to **both** Production and Preview environments.

| Variable          | Required | Default                  | Purpose                                              |
|-------------------|----------|--------------------------|------------------------------------------------------|
| `RESEND_API_KEY`  | ✅ Yes   | (no default)             | Resend API key. Never commit.                        |
| `CONTACT_TO`      | No       | `info@suzidesign.com`    | Where contact form mails are delivered.              |
| `CONTACT_FROM`    | No       | `form@suzidesign.com`    | "From" address (domain must be verified in Resend).  |

Note: `form@suzidesign.com` doesn't need to be a real mailbox; Resend allows sending from any `@suzidesign.com` address once the domain is verified. Replies use the customer's email via `reply_to` header.

## Pages Functions

`functions/api/contact.ts` is a Cloudflare Pages Function. CF auto-detects `functions/` at the project root; no Astro adapter needed (site stays static).

- Endpoint: `POST /api/contact`
- Accepts: `multipart/form-data` or `application/json`
- Returns: `{ ok: true }` or `{ ok: false, error: string }`
- Spam: honeypot field `website` (empty = OK, filled = silent success)

## Contact

- Brand: Suzi Design (Köylü family, Istanbul)
- Developer: Murat Özsaygılı (ESC Bilişim) · info@suzidesign.com
