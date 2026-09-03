import { buildGalleryHTML } from '../html/gallery';
import { addSecurityHeaders } from '../app/security';
import { getIndexStub, type GalleryApp } from '../app/worker';
import type { ListResponse, SiteMeta } from '../types';

export const registerGalleryRoutes = (app: GalleryApp) => {
  app.get('/api/health', (c) =>
    addSecurityHeaders(c.json({ ok: true, now: new Date().toISOString() })),
  );

  app.get('/api/images', async (c) => {
    const cursor = c.req.query('cursor');
    const limit = c.req.query('limit');
    const q = c.req.query('q');
    const tag = c.req.query('tag');
    const status = c.req.query('status');
    const stub = getIndexStub(c.env);
    const qs = new URLSearchParams();
    if (cursor) qs.set('cursor', cursor);
    if (limit) qs.set('limit', limit);
    if (q) qs.set('q', q);
    if (tag) qs.set('tag', tag);
    if (status) qs.set('status', status);
    const resp = await stub.fetch(`https://index/list?${qs.toString()}`);
    const data = (await resp.json()) as ListResponse;
    return addSecurityHeaders(
      new Response(JSON.stringify(data), {
        status: resp.status,
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': q
            ? 'private, no-store'
            : 'public, max-age=30, stale-while-revalidate=120',
        },
      }),
    );
  });

  app.get('/', async (c) => {
    const baseUrl = new URL('/', c.req.url).toString();
    let siteMeta: SiteMeta | null = null;
    try {
      const stub = getIndexStub(c.env);
      const resp = await stub.fetch('https://index/site-meta');
      if (resp.ok) {
        const data = (await resp.json()) as Partial<SiteMeta> | null;
        // Only pass through if it looks like a usable SiteMeta; otherwise the
        // builder falls back to baked-in defaults.
        if (data && typeof data.title === 'string' && typeof data.subtitle === 'string') {
          siteMeta = data as SiteMeta;
        }
      }
    } catch (_e) {
      // fall back to defaults baked into buildGalleryHTML
    }
    return addSecurityHeaders(c.html(buildGalleryHTML(baseUrl, siteMeta)));
  });
};
