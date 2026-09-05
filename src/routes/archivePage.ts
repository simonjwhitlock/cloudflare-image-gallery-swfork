import { addSecurityHeaders } from '../app/security';
import { getIndexStub, type GalleryApp } from '../app/worker';
import { FAVICON_SVG } from '../favicon';
import type { ListResponse } from '../types';

const faviconHeaders = {
  'Content-Type': 'image/svg+xml; charset=utf-8',
  'Cache-Control': 'public, max-age=604800, stale-while-revalidate=86400',
};

/** All images the archive script needs, inlined as JSON (archive is small by design). */
const esc = (s: string): string =>
  s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

const buildArchiveStyles = (): string => `<style>
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
:root,[data-theme="dark"]{--bg:#000;--surface:#0a0a0a;--text:#fff;--text-dim:rgba(255,255,255,0.4);--text-muted:rgba(255,255,255,0.25);--border:rgba(255,255,255,0.08)}
[data-theme="light"]{--bg:#f5f3f0;--surface:#eae7e3;--text:#1a1a1a;--text-dim:rgba(0,0,0,0.45);--text-muted:rgba(0,0,0,0.2);--border:rgba(0,0,0,0.1)}
body{background:var(--bg);color:var(--text);font-family:'Inter',system-ui,sans-serif;-webkit-font-smoothing:antialiased;min-height:100vh;transition:background 0.4s,color 0.4s}
a{color:inherit}
.site-nav{display:flex;justify-content:space-between;align-items:center;padding:1.25rem 2rem}
.brand{font-family:'Epilogue',sans-serif;font-weight:800;letter-spacing:0.1em;text-transform:uppercase;font-size:0.8rem;text-decoration:none}
.theme-toggle{background:none;border:none;cursor:pointer;color:var(--text-dim);font-size:1rem}
.theme-toggle:hover{color:var(--text)}
.hero{padding:4rem 2rem 2.5rem;text-align:center}
.hero h1{font-family:'Epilogue',sans-serif;font-size:clamp(1.5rem,4vw,2.5rem);font-weight:800;letter-spacing:0.1em;text-transform:uppercase}
.hero p{margin-top:0.75rem;font-size:0.7rem;text-transform:uppercase;letter-spacing:0.4em;color:var(--text-dim);font-weight:600}
.archive-toolbar{max-width:1200px;margin:0 auto 2rem;padding:0 2rem;display:flex;gap:0.75rem;flex-wrap:wrap;justify-content:center}
.archive-toolbar input{
  background:transparent;border:1px solid var(--border);color:var(--text);
  font-family:'Inter',sans-serif;font-size:0.8rem;padding:0.6rem 1rem;min-width:16rem;
}
.archive-toolbar input:focus{outline:none;border-color:var(--text-muted)}
.archive-grid{
  column-count:3;column-gap:1.25rem;max-width:1200px;margin:0 auto;padding:0 2rem 4rem;
}
@media(max-width:900px){.archive-grid{column-count:2}}
@media(max-width:560px){.archive-grid{column-count:1}}
.archive-item{break-inside:avoid;margin-bottom:1.25rem;cursor:pointer;position:relative}
.archive-item img{width:100%;display:block;opacity:0.85;transition:opacity 0.3s}
.archive-item:hover img{opacity:1}
.archive-item figcaption{
  font-family:'Epilogue',sans-serif;font-size:0.55rem;text-transform:uppercase;
  letter-spacing:0.15em;color:var(--text-dim);padding:0.4rem 0.1rem 0;
}
.archive-empty{text-align:center;padding:4rem 2rem;color:var(--text-dim);font-size:0.875rem;display:none}
.count-note{max-width:1200px;margin:0 auto;padding:0 2rem 1rem;font-size:0.65rem;letter-spacing:0.15em;text-transform:uppercase;color:var(--text-muted);font-family:'Inter',sans-serif}
::selection{background:var(--text);color:var(--bg)}
</style>`;

const buildArchiveScript = (initialCount: number, dataJson: string): string => `<script>
(function(){
  var IMAGES = ${dataJson};
  var grid = document.getElementById('archiveGrid');
  var search = document.getElementById('archiveSearch');
  var countNote = document.getElementById('countNote');

  var render = function(items){
    grid.innerHTML = '';
    var frag = document.createDocumentFragment();
    for (var i = 0; i < items.length; i++) {
      var it = items[i];
      var fig = document.createElement('figure');
      fig.className = 'archive-item';
      var img = document.createElement('img');
      img.loading = 'lazy';
      img.decoding = 'async';
      img.alt = it.alt || it.name || 'Archive photograph';
      img.src = '/img/' + it.id + '?w=480&q=78&fmt=auto';
      fig.appendChild(img);
      var cap = document.createElement('figcaption');
      var parts = [];
      if (it.location) parts.push(it.location);
      if (it.captureDate) {
        var d = /^\\d{4}-\\d{2}-\\d{2}$/.test(it.captureDate)
          ? new Date(it.captureDate + 'T00:00:00Z').toLocaleDateString('en-US',{month:'short',year:'numeric'})
          : it.captureDate;
        parts.push(d);
      }
      cap.textContent = parts.join(' \\u2022 ');
      fig.appendChild(cap);
      fig.setAttribute('tabindex','0');
      fig.setAttribute('role','button');
      (function(id, alt){
        fig.addEventListener('click', function(){ window.open('/media/' + id, '_blank', 'noopener'); });
        fig.addEventListener('keydown', function(e){ if (e.key === 'Enter') window.open('/media/' + id, '_blank', 'noopener'); });
      })(it.id);
      frag.appendChild(fig);
    }
    grid.appendChild(frag);
    countNote.textContent = items.length + ' of ' + ${initialCount} + ' archived photographs';
  };

  var applyFilter = function(){
    var term = search.value.trim().toLowerCase();
    if (!term) { render(IMAGES); return; }
    var filtered = [];
    for (var i = 0; i < IMAGES.length; i++) {
      var it = IMAGES[i];
      var hay = [it.name, it.alt, it.location, it.captureDate, it.description, (it.tags||[]).join(' '), it.cameraBody, it.lens]
        .join(' ').toLowerCase();
      if (hay.indexOf(term) !== -1) filtered.push(it);
    }
    render(filtered);
  };

  var timer = null;
  search.addEventListener('input', function(){
    if (timer) clearTimeout(timer);
    timer = setTimeout(applyFilter, 200);
  });

  render(IMAGES);
})();
</script>`;

export const registerArchiveRoutes = (app: GalleryApp) => {
  app.get('/favicon.svg', (c) =>
    addSecurityHeaders(new Response(FAVICON_SVG, { headers: faviconHeaders })),
  );

  app.get('/archive', async (c) => {
    const stub = getIndexStub(c.env);
    let all: unknown[] = [];
    let cursor: string | null | undefined;
    do {
      const p = new URLSearchParams({ limit: '200', status: 'archive' });
      if (cursor) p.set('cursor', cursor);
      const resp = await stub.fetch(`https://index/list?${p.toString()}`);
      if (!resp.ok) break;
      const data = (await resp.json()) as ListResponse;
      all = all.concat(data.items || []);
      cursor = data.cursor;
    } while (cursor && all.length < 1000);

    const baseUrl = new URL('/', c.req.url).origin;
    const safeItems = all.map((it) => ({
      id: String((it as { id?: unknown }).id ?? ''),
      name: String((it as { name?: unknown }).name ?? ''),
      alt: String((it as { alt?: unknown }).alt ?? ''),
      location: String((it as { location?: unknown }).location ?? ''),
      captureDate: String((it as { captureDate?: unknown }).captureDate ?? ''),
      description: String((it as { description?: unknown }).description ?? ''),
      tags: Array.isArray((it as { tags?: unknown }).tags) ? (it as { tags: string[] }).tags : [],
      cameraBody: String((it as { cameraBody?: unknown }).cameraBody ?? ''),
      lens: String((it as { lens?: unknown }).lens ?? ''),
    }));
    const dataJson = JSON.stringify(safeItems).replace(/</g, '\\u003c');

    const html = `<!doctype html>
<html lang="en" data-theme="dark">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>Archive</title>
<meta name="robots" content="noindex" />
<link rel="icon" href="/favicon.svg" type="image/svg+xml" />
<link href="https://fonts.googleapis.com/css2?family=Epilogue:wght@400;700;800&family=Inter:wght@400;600&display=swap" rel="stylesheet" />
${buildArchiveStyles()}
</head>
<body>
<nav class="site-nav">
  <a class="brand" href="/">← ${esc(baseUrl.replace(/^https?:\/\//, ''))}</a>
  <button class="theme-toggle" id="themeToggle" type="button" aria-label="Toggle theme">◐</button>
</nav>
<header class="hero">
  <h1>Archive</h1>
  <p>Browse the full collection</p>
</header>
<div class="archive-toolbar">
  <input id="archiveSearch" type="search" placeholder="Search by place, date, tag, camera…" aria-label="Search archive" />
</div>
<div class="count-note" id="countNote"></div>
<div class="archive-grid" id="archiveGrid"></div>
${buildArchiveScript(all.length, dataJson)}
<script>
  (function(){
    var html = document.documentElement;
    var t = document.getElementById('themeToggle');
    var stored = localStorage.getItem('theme');
    if (stored === 'light' || stored === 'dark') html.setAttribute('data-theme', stored);
    t.addEventListener('click', function(){
      var next = html.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
      html.setAttribute('data-theme', next);
      localStorage.setItem('theme', next);
    });
  })();
</script>
</body>
</html>`;
    return addSecurityHeaders(
      c.html(html, 200, { 'Cache-Control': 'public, max-age=60, stale-while-revalidate=300' }),
    );
  });
};