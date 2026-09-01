import { addSecurityHeaders } from './security';
import type { ImageMeta } from '../types';

export const PRIVATE_NO_STORE = 'private, no-store';

export const PUBLIC_IMAGE_CACHE =
  'public, max-age=86400, s-maxage=604800, stale-while-revalidate=604800, immutable';

export const MEDIA_NOT_MODIFIED_CACHE = 'public, max-age=86400, stale-while-revalidate=604800';

type R2ImageObject = {
  body: ReadableStream | null;
  httpEtag?: string;
  etag?: string;
  size?: number;
};

export const etagsMatch = (ifNoneMatch: string | undefined, etag: string | undefined): boolean => {
  if (!etag || !ifNoneMatch) return false;
  return ifNoneMatch.replace(/W\//, '') === etag.replace(/W\//, '');
};

export const notFoundResponse = (secure = false): Response => {
  const resp = Response.json(
    { error: 'Not found' },
    { status: 404, headers: { 'Cache-Control': PRIVATE_NO_STORE } },
  );
  return secure ? addSecurityHeaders(resp) : resp;
};

export const notModifiedResponse = (
  etag: string,
  cacheControl: string,
  extraHeaders?: Record<string, string>,
): Response =>
  new Response(null, {
    status: 304,
    headers: {
      ETag: etag,
      'Cache-Control': cacheControl,
      ...extraHeaders,
    },
  });

export const r2ObjectEtag = (obj: R2ImageObject, meta: Pick<ImageMeta, 'id' | 'size'>): string =>
  obj.httpEtag || obj.etag || `"${meta.id}-${meta.size}"`;

export const buildR2ImageResponse = (
  obj: R2ImageObject,
  meta: Pick<ImageMeta, 'contentType' | 'id' | 'size'>,
): Response => {
  const headers = new Headers();
  headers.set('Content-Type', meta.contentType || 'image/jpeg');
  headers.set('Cache-Control', PUBLIC_IMAGE_CACHE);
  headers.set('Vary', 'Accept');
  headers.set('ETag', r2ObjectEtag(obj, meta));
  if (typeof obj.size === 'number') headers.set('Content-Length', String(obj.size));
  return new Response(obj.body, { headers });
};

/**
 * Builds an image response from fully buffered bytes.
 *
 * Serving and edge-caching from an in-memory buffer (instead of cloning a
 * streaming response) guarantees `cache.put()` completes almost instantly in
 * `waitUntil`, avoiding "waitUntil() tasks did not complete" cancellations
 * when the client aborts the download (e.g. fast carousel navigation).
 */
export const buildBufferedImageResponse = (
  bytes: ArrayBuffer,
  contentType: string | undefined,
  etag: string,
): Response => {
  const headers = new Headers();
  headers.set('Content-Type', contentType || 'image/jpeg');
  headers.set('Cache-Control', PUBLIC_IMAGE_CACHE);
  headers.set('Vary', 'Accept');
  headers.set('ETag', etag);
  headers.set('Content-Length', String(bytes.byteLength));
  return new Response(bytes, { headers });
};

export const buildTransformedImageResponse = (upstream: Response, etag: string): Response => {
  const headers = new Headers(upstream.headers);
  headers.set('ETag', etag);
  headers.set('Cache-Control', PUBLIC_IMAGE_CACHE);
  headers.set('Vary', 'Accept');
  return new Response(upstream.body, { headers, status: upstream.status });
};
