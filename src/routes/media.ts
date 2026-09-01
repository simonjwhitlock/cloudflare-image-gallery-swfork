import { buildCacheKey, getEdgeCache } from '../app/cache';
import {
  MEDIA_NOT_MODIFIED_CACHE,
  PUBLIC_IMAGE_CACHE,
  buildBufferedImageResponse,
  buildR2ImageResponse,
  buildTransformedImageResponse,
  etagsMatch,
  notFoundResponse,
  notModifiedResponse,
  r2ObjectEtag,
} from '../app/mediaResponse';
import { addSecurityHeaders } from '../app/security';
import { getIndexStub, type GalleryApp } from '../app/worker';
import type { Env, ImageMeta } from '../types';

const buildImageOrigin = (env: Env, key: string) => {
  if (env.R2_PUBLIC_HOST) {
    return `https://${env.R2_PUBLIC_HOST.replace(/\/+$/, '')}/${key}`;
  }
  return null;
};

export const registerMediaRoutes = (app: GalleryApp) => {
  app.get('/media/:id', async (c) => {
    const cache = getEdgeCache();
    const cacheReq = new Request(c.req.url);
    const cached = await cache.match(cacheReq);
    if (cached) return cached;

    const id = c.req.param('id');
    const stub = getIndexStub(c.env);
    const metaResp = await stub.fetch(`https://index/meta/${id}`);
    if (!metaResp.ok) return notFoundResponse();

    const meta = (await metaResp.json()) as ImageMeta;
    const obj = await c.env.IMAGES_BUCKET.get(meta.key);
    if (!obj || !obj.body) return notFoundResponse(true);

    const etag = r2ObjectEtag(obj, meta);
    if (etagsMatch(c.req.header('if-none-match'), etag)) {
      return notModifiedResponse(etag, MEDIA_NOT_MODIFIED_CACHE);
    }

    // Buffer the object so the edge-cache write completes quickly in
    // waitUntil instead of being tied to the client's download.
    const bytes = await obj.arrayBuffer();
    const resp = addSecurityHeaders(buildBufferedImageResponse(bytes, meta.contentType, etag));
    c.executionCtx?.waitUntil(cache.put(cacheReq, resp.clone()));
    return resp;
  });

  app.get('/img/:id', async (c) => {
    const cache = getEdgeCache();
    const accept = c.req.header('accept');
    const edgeKey = buildCacheKey(c.req.url, accept);
    const cached = await cache.match(edgeKey);
    if (cached) return cached;

    const id = c.req.param('id');
    const width = c.req.query('w');
    const quality = c.req.query('q');
    const format = c.req.query('fmt');
    const dprRaw = c.req.header('sec-ch-dpr') || '';
    const dpr = Number(dprRaw) || 1;

    const stub = getIndexStub(c.env);
    const metaResp = await stub.fetch(`https://index/meta/${id}`);
    if (!metaResp.ok) return notFoundResponse();

    const meta = (await metaResp.json()) as ImageMeta;

    const origin = buildImageOrigin(c.env, meta.key) || `${new URL(c.req.url).origin}/media/${id}`;

    const imageOpts: Record<string, unknown> = {};
    const requested = width ? Number(width) || undefined : undefined;
    const effectiveWidth = requested
      ? Math.round(Math.min(requested * Math.min(dpr, 2), meta.width || requested))
      : undefined;
    if (effectiveWidth) imageOpts.width = effectiveWidth;
    imageOpts.quality = quality ? Number(quality) || undefined : 85;
    imageOpts.format = format || 'auto';

    const cacheTag = `img-${id}-w${imageOpts.width || 'orig'}-q${imageOpts.quality || ''}-${imageOpts.format || ''}`;
    const etag = `"v-${id}-${imageOpts.width || 'orig'}-${imageOpts.quality || ''}-${imageOpts.format || ''}"`;
    if (etagsMatch(c.req.header('if-none-match'), etag)) {
      return notModifiedResponse(etag, PUBLIC_IMAGE_CACHE, { Vary: 'Accept' });
    }

    const serveFallbackFor = async () => {
      const obj = await c.env.IMAGES_BUCKET.get(meta.key);
      if (!obj?.body) return notFoundResponse(true);
      // Buffer so the cache write in waitUntil can complete immediately.
      const bytes = await obj.arrayBuffer();
      const fallback = addSecurityHeaders(
        buildBufferedImageResponse(bytes, meta.contentType, r2ObjectEtag(obj, meta)),
      );
      c.executionCtx?.waitUntil(cache.put(edgeKey, fallback.clone()));
      return fallback;
    };

    let resp: Response;
    try {
      resp = await fetch(origin, {
        cf: {
          image: imageOpts,
          cacheEverything: true,
          cacheTtl: 86400,
          cacheKey: cacheTag,
        },
      });
    } catch (_e) {
      // Transform subrequest failed outright (DNS/network) — serve from R2.
      return serveFallbackFor();
    }

    // A non-image 200 (e.g. an origin error page) would otherwise be cached
    // and served as a "thumbnail"; treat it as a failure and fall back to R2.
    const contentType = resp.headers.get('Content-Type') || '';
    if (!resp.ok || !contentType.startsWith('image/')) {
      return serveFallbackFor();
    }

    // Buffer the transformed image so the edge-cache write in waitUntil is a
    // quick memory copy rather than a stream clone tied to the client's
    // download speed. Cloned streams stall (and get cancelled) when the client
    // aborts a preload — the source of the waitUntil warnings.
    const bytes = await resp.arrayBuffer();
    const final = addSecurityHeaders(
      buildBufferedImageResponse(bytes, contentType || undefined, etag),
    );
    c.executionCtx?.waitUntil(cache.put(edgeKey, final.clone()));
    return final;
  });
};
