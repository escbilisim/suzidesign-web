// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

// https://astro.build/config
export default defineConfig({
  site: 'https://suzidesign.com',
  output: 'static',
  trailingSlash: 'ignore',
  compressHTML: true,           // T9 family: HTML whitespace strip
  prefetch: false,              // T10: prefetch infrastructure off, 0 external JS in dist
  i18n: {
    defaultLocale: 'tr',
    locales: ['tr', 'en'],
    routing: {
      prefixDefaultLocale: false, // / = TR, /en/ = EN
    },
  },
  integrations: [
    sitemap({
      i18n: {
        defaultLocale: 'tr',
        locales: {
          tr: 'tr-TR',
          en: 'en-US',
        },
      },
      // 404 + /urunler index'lenmez.
      // /urunler Curator.io 3rd-party widget (2000 view/ay limit) ile çalışır;
      // bot trafiği quota'yı tüketmemeli (locked rule B2 + bu kararın gerekçesi).
      filter: (page) => !page.includes('/404') && !page.includes('/urunler') && !page.includes('/en/products'),
    }),
  ],
  build: {
    inlineStylesheets: 'always', // T9: render-blocking CSS request elimine
  },
});
