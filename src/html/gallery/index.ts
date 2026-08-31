import { buildGalleryBody } from './markup';
import { buildGalleryScript } from '../../client/gallery';
import { buildGalleryStyles } from './styles';
import type { SiteMeta } from '../../types';

const DEFAULT_SITE_META: SiteMeta = {
  title: 'Stills from my\nfilm camera',
  subtitle: 'A project by Aanjney',
  contactEmail: 'aanjneygupta43@gmail.com',
  titleFont: '',
  titleSize: '',
  titleWeight: 0,
  titleSpacing: '',
  titleTransform: '',
  titleAlign: '',
  heroSize: '',
  colors: { darkText: '', darkBg: '', lightText: '', lightBg: '' },
};

/** Escape text for safe interpolation into HTML elements/attributes. */
const esc = (s: string): string =>
  s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

/** Values accepted here are already validated/sanitized by the Durable Object on save. */
const HERO_SIZE_PADDING: Record<string, string> = {
  sm: '6rem 2rem 4rem',
  md: '9rem 2rem 6rem',
  lg: '12rem 2rem 8rem',
  xl: '16rem 2rem 10rem',
};

/**
 * Builds a `<style>` block applying admin-configured hero typography and theme
 * color overrides. All values arrive pre-sanitized from the Durable Object;
 * this function additionally passes them through `esc` where interpolated.
 */
export function buildHeroStyleOverrides(meta: SiteMeta): string {
  const rules: string[] = [];

  // ── Title typography ──
  // Typography must target .hero-title (the h1), not .hero: the base stylesheet
  // sets font-family/size/weight directly on .hero-title, and an element's own
  // rule always beats values inherited from its parent.
  const titleDecls: string[] = [];
  const layoutDecls: string[] = [];
  if (meta.titleFont)
    titleDecls.push(`font-family:${meta.titleFont.replace(/['"\\]/g, '')},sans-serif`);
  if (meta.titleSize && !Number.isNaN(Number(meta.titleSize)))
    titleDecls.push(`font-size:clamp(2rem,8vmax,${Number(meta.titleSize)}rem)`);
  if (meta.titleWeight >= 100 && meta.titleWeight <= 900)
    titleDecls.push(`font-weight:${meta.titleWeight}`);
  if (meta.titleSpacing) titleDecls.push(`letter-spacing:${meta.titleSpacing}em`);
  if (meta.titleTransform && meta.titleTransform !== 'uppercase')
    titleDecls.push(`text-transform:${meta.titleTransform}`);
  else if (meta.titleTransform === '') titleDecls.push(`text-transform:uppercase`);

  if (meta.titleAlign) layoutDecls.push(`text-align:${meta.titleAlign}`);
  if (meta.heroSize) {
    const padding = HERO_SIZE_PADDING[meta.heroSize];
    if (padding) layoutDecls.push(`padding:${padding}`);
  }
  if (titleDecls.length) rules.push(`.hero-title{${titleDecls.join(';')}}`);
  if (layoutDecls.length) rules.push(`.hero{${layoutDecls.join(';')}}`);

  // ── Theme colors ──
  const c = meta.colors || { darkText: '', darkBg: '', lightText: '', lightBg: '' };
  const darkDecls: string[] = [];
  const lightDecls: string[] = [];
  if (c.darkText) darkDecls.push(`--text:${c.darkText}`);
  if (c.darkBg) darkDecls.push(`--bg:${c.darkBg}`);
  if (c.lightText) lightDecls.push(`--text:${c.lightText}`);
  if (c.lightBg) lightDecls.push(`--bg:${c.lightBg}`);
  if (darkDecls.length) rules.push(`:root,[data-theme="dark"]{${darkDecls.join(';')}}`);
  if (lightDecls.length) rules.push(`[data-theme="light"]{${lightDecls.join(';')}}`);

  if (!rules.length) return '';
  return `<style id="site-style-overrides">${rules.join('\n')}</style>`;
}

export function buildGalleryHTML(baseUrl: string, siteMeta?: SiteMeta | null): string {
  const meta =
    siteMeta && siteMeta.title && siteMeta.subtitle && siteMeta.contactEmail
      ? siteMeta
      : DEFAULT_SITE_META;

  const plainTitle = meta.title.replace(/\n+/g, ' ').trim();
  const heroTitleHTML = esc(meta.title.trim()).replace(/\n+/g, '<br>');
  const subtitle = meta.subtitle.trim();
  const contactEmail = meta.contactEmail.trim();

  const structuredData = JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'ImageGallery',
    name: plainTitle,
    description: subtitle,
    url: baseUrl,
  }).replace(/</g, '\\u003c');

  const styleOverrides = buildHeroStyleOverrides(meta);

  return `<!doctype html>
<html lang="en" data-theme="dark">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>${esc(plainTitle)}</title>
<meta name="description" content="${esc(subtitle)}" />
<meta name="theme-color" content="#000000" />
<link rel="icon" href="/favicon.svg" type="image/svg+xml" />
<meta property="og:type" content="website" />
<meta property="og:title" content="${esc(plainTitle)}" />
<meta property="og:description" content="${esc(subtitle)}" />
<meta property="og:url" content="${baseUrl}" />
<meta name="twitter:card" content="summary_large_image" />
<link rel="canonical" href="${baseUrl}" />
<link rel="preload" href="/api/images?limit=200" as="fetch" crossorigin />
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
<link href="https://fonts.googleapis.com/css2?family=Epilogue:wght@400;500;600;700;800;900&family=Inter:wght@400;500;600&display=swap" rel="stylesheet" />
<link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap" rel="stylesheet" media="print" onload="this.media='all'" />
<script type="application/ld+json">${structuredData}</script>
${buildGalleryStyles()}
${styleOverrides}
</head>
<body>
${buildGalleryBody(heroTitleHTML, subtitle, contactEmail)}
${buildGalleryScript()}
</body>
</html>`;
}
