import { Env, ImageMeta, ListResponse, StatsResponse, SiteMeta, HeroAlign } from '../types';

type AddPayload = ImageMeta;

const ORDER_KEY = 'order';
const SITE_META_KEY = 'site_meta';
const META_PREFIX = 'meta:';
export const ORDER_LIMIT = 5000;
const META_READ_BATCH = 128;

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

const TITLE_TRANSFORMS = new Set(['', 'none', 'uppercase', 'lowercase', 'capitalize']);
const TITLE_ALIGNS = new Set<HeroAlign | ''>(['', 'left', 'center', 'right']);
const HERO_SIZES = new Set(['', 'sm', 'md', 'lg', 'xl']);
const CSS_COLOR_RE =
  /^(#[0-9a-fA-F]{3,8}|rgba?\(\s*[\d.]+\s*,\s*[\d.]+\s*,\s*[\d.]+\s*(,\s*[\d.]+\s*)?\)|)$/;
const FONT_NAME_RE = /^[^{}<>@;\\/]{0,120}$/;

/** Keep only printable chars and strip HTML-meaningful ones for safe CSS values. */
const sanitizeCssText = (s: unknown, max: number): string => {
  if (typeof s !== 'string') return '';
  return s
    .replace(/[\u0000-\u001f\u007f]/g, '')
    .replace(/[{}<>@;\\]/g, '')
    .trim()
    .slice(0, max);
};

const sanitizeColor = (s: unknown): string => {
  const v = sanitizeCssText(s, 40);
  return CSS_COLOR_RE.test(v) ? v : '';
};

const sanitizeTitleTransform = (s: unknown): string => {
  const v = sanitizeCssText(s, 20).toLowerCase();
  return TITLE_TRANSFORMS.has(v) ? v : '';
};

const sanitizeTitleAlign = (s: unknown): HeroAlign | '' => {
  const v = sanitizeCssText(s, 10).toLowerCase();
  return TITLE_ALIGNS.has(v as HeroAlign | '') ? (v as HeroAlign | '') : '';
};

const clampWeight = (w: unknown): number => {
  const n = typeof w === 'number' ? Math.round(w) : 0;
  if (n >= 100 && n <= 900 && n % 100 === 0) return n;
  return 0;
};

const STATUSES = new Set(['', 'active', 'archive', 'removed']);
const normalizeStatus = (input: unknown): 'active' | 'archive' | 'removed' => {
  const v = typeof input === 'string' ? input.trim().toLowerCase() : '';
  return STATUSES.has(v) && v !== '' ? (v as 'active' | 'archive' | 'removed') : 'active';
};

/** Lowercases, trims and de-dupes tags; max 12 tags of up to 32 chars each. */
const normalizeTags = (input: unknown): string[] | undefined => {
  if (!Array.isArray(input)) return undefined;
  const seen = new Set<string>();
  for (const raw of input) {
    if (typeof raw !== 'string') continue;
    const t = raw.trim().toLowerCase().replace(/[^a-z0-9 \-_]/g, '').slice(0, 32);
    if (t && seen.size < 12) seen.add(t);
  }
  return seen.size ? Array.from(seen) : undefined;
};

/** Accepts ISO yyyy-mm-dd or free-form text up to 40 chars. */
const normalizeCaptureDate = (input: unknown): string | undefined => {
  if (typeof input !== 'string') return undefined;
  const v = input.trim().slice(0, 40);
  return v || undefined;
};

export class ImageIndex {
  private readonly state: DurableObjectState;
  constructor(state: DurableObjectState, _env: Env) {
    this.state = state;
  }

  async fetch(request: Request) {
    const url = new URL(request.url);

    if (request.method === 'POST' && url.pathname === '/add') {
      return this.handleAdd(request);
    }

    if (request.method === 'POST' && url.pathname === '/update') {
      return this.handleUpdate(request);
    }

    if (request.method === 'GET' && url.pathname === '/list') {
      return this.handleList(url);
    }

    if (request.method === 'GET' && url.pathname === '/stats') {
      return this.handleStats();
    }

    if (request.method === 'GET' && url.pathname.startsWith('/meta/')) {
      const [, , id] = url.pathname.split('/');
      if (!id) return new Response('Missing id', { status: 400 });
      return this.handleGet(id);
    }

    if (request.method === 'POST' && url.pathname === '/delete') {
      return this.handleDelete(request);
    }

    if (url.pathname === '/site-meta') {
      if (request.method === 'GET') return this.handleGetSiteMeta();
      if (request.method === 'POST') return this.handleUpdateSiteMeta(request);
    }

    return new Response('Not found', { status: 404 });
  }

  private async handleGetSiteMeta() {
    const stored = await this.state.storage.get<SiteMeta>(SITE_META_KEY);
    // Merge over defaults so records saved before the styling fields existed
    // (or with missing fields) still return a complete SiteMeta.
    const meta: SiteMeta = stored
      ? {
          ...DEFAULT_SITE_META,
          ...stored,
          colors: { ...DEFAULT_SITE_META.colors, ...(stored.colors || {}) },
        }
      : DEFAULT_SITE_META;
    return Response.json(meta);
  }

  private async handleUpdateSiteMeta(request: Request) {
    try {
      const payload = (await request.json()) as Partial<SiteMeta>;
      if (
        !payload ||
        typeof payload.title !== 'string' ||
        !payload.title.trim() ||
        typeof payload.subtitle !== 'string' ||
        !payload.subtitle.trim() ||
        typeof payload.contactEmail !== 'string' ||
        !payload.contactEmail.trim()
      ) {
        return new Response('title, subtitle and contactEmail are required', {
          status: 400,
        });
      }
      const meta: SiteMeta = {
        title: payload.title,
        subtitle: payload.subtitle,
        contactEmail: payload.contactEmail,
        titleFont: FONT_NAME_RE.test(payload.titleFont ?? '')
          ? sanitizeCssText(payload.titleFont, 120)
          : '',
        titleSize: sanitizeCssText(payload.titleSize, 8).replace(/[^\d.]/g, ''),
        titleWeight: clampWeight(payload.titleWeight),
        titleSpacing: sanitizeCssText(payload.titleSpacing, 8).replace(/[^\d.\-]/g, ''),
        titleTransform: sanitizeTitleTransform(payload.titleTransform),
        titleAlign: sanitizeTitleAlign(payload.titleAlign),
        heroSize: HERO_SIZES.has(payload.heroSize as SiteMeta['heroSize'])
          ? (payload.heroSize as SiteMeta['heroSize'])
          : '',
        colors: {
          darkText: sanitizeColor(payload.colors?.darkText),
          darkBg: sanitizeColor(payload.colors?.darkBg),
          lightText: sanitizeColor(payload.colors?.lightText),
          lightBg: sanitizeColor(payload.colors?.lightBg),
        },
      };
      await this.state.storage.put(SITE_META_KEY, meta);
      return Response.json(meta);
    } catch (_e) {
      return new Response('Invalid JSON', { status: 400 });
    }
  }

  private async handleAdd(request: Request) {
    let payload: AddPayload;
    try {
      payload = (await request.json()) as AddPayload;
    } catch (_e) {
      return new Response('Invalid JSON', { status: 400 });
    }

    if (!payload?.id || !payload.key || !payload.createdAt) {
      return new Response('Missing required fields', { status: 400 });
    }

    const meta: ImageMeta = {
      id: payload.id,
      key: payload.key,
      createdAt: payload.createdAt,
      size: payload.size ?? 0,
      contentType: payload.contentType ?? 'image/jpeg',
      width: payload.width,
      height: payload.height,
      alt: payload.alt,
      name: payload.name,
      placeholder: payload.placeholder,
      cameraBody: payload.cameraBody,
      // Accept the new `lens` field plus legacy `filmStock` from old clients.
      lens: (payload as { lens?: string }).lens ?? (payload as { filmStock?: string }).filmStock,
      location: payload.location,
      captureDate: normalizeCaptureDate(payload.captureDate),
      description: typeof payload.description === 'string' ? payload.description.trim() : undefined,
      tags: normalizeTags(payload.tags),
      status: normalizeStatus(payload.status),
      year: payload.year,
    };

    const order = ((await this.state.storage.get<string[]>(ORDER_KEY)) ?? []) as string[];
    const isExisting = order.includes(meta.id);
    if (!isExisting && order.length >= ORDER_LIMIT) {
      return new Response('Index at capacity', { status: 409 });
    }

    const newOrder = [meta.id, ...order.filter((i) => i !== meta.id)];

    await Promise.all([
      this.state.storage.put(`${META_PREFIX}${meta.id}`, meta),
      this.state.storage.put(ORDER_KEY, newOrder),
    ]);

    return Response.json(meta);
  }

  private async handleStats() {
    const order = ((await this.state.storage.get<string[]>(ORDER_KEY)) ?? []) as string[];
    const metaById = await this.getMetaById(order);
    let total = 0;
    let totalBytes = 0;
    let latestCreatedAt: string | null = null;

    for (const id of order) {
      const m = metaById.get(id);
      if (!m) continue;
      total += 1;
      totalBytes += m.size ?? 0;
      if (m.createdAt && (!latestCreatedAt || m.createdAt > latestCreatedAt)) {
        latestCreatedAt = m.createdAt;
      }
    }

    const body: StatsResponse = {
      total,
      totalBytes,
      latestCreatedAt,
      avgSize: total ? Math.round(totalBytes / total) : 0,
    };
    return Response.json(body);
  }

  private async handleList(url: URL) {
    const limitParam = url.searchParams.get('limit');
    const cursorParam = url.searchParams.get('cursor');
    const q = url.searchParams.get('q')?.toLowerCase().trim() || '';
    const tag = url.searchParams.get('tag')?.toLowerCase().trim() || '';
    // status filter: 'active' (default) | 'archive' | 'removed' | 'all' (admin)
    const statusParam = url.searchParams.get('status')?.toLowerCase().trim() || '';
    const status =
      statusParam === 'archive' || statusParam === 'removed' || statusParam === 'all'
        ? statusParam
        : 'active';

    const limit = Math.min(500, Math.max(1, limitParam ? Number(limitParam) || 20 : 20));

    let offset = 0;
    if (cursorParam) {
      try {
        const decoded = JSON.parse(
          new TextDecoder().decode(Uint8Array.from(atob(cursorParam), (c) => c.charCodeAt(0))),
        );
        if (typeof decoded.offset === 'number') {
          offset = decoded.offset;
        }
      } catch (_e) {
        // Ignore bad cursor and fall back to 0.
      }
    }

    const order = ((await this.state.storage.get<string[]>(ORDER_KEY)) ?? []) as string[];

    let listSource = order;
    let metaById: Map<string, ImageMeta> | null = null;

    if (q || tag || status !== 'all') {
      const allMeta = await this.getMetaById(order);
      metaById = allMeta;
      listSource = order.filter((id) => {
        const m = allMeta.get(id);
        if (!m) return false;
        if (status !== 'all') {
          const s = m.status || 'active';
          if (s !== status) return false;
        }
        if (tag && !(m.tags?.includes(tag) ?? false)) return false;
        return q ? this.matchesQuery(m, q) : true;
      });
    }

    const slice = listSource.slice(offset, offset + limit);
    if (!metaById) metaById = await this.getMetaById(slice);

    const items = slice.map((id) => metaById.get(id)).filter((m): m is ImageMeta => Boolean(m));
    const nextOffset = offset + slice.length;
    const nextCursor =
      nextOffset < listSource.length ? btoa(JSON.stringify({ offset: nextOffset })) : null;

    const body: ListResponse = { items, cursor: nextCursor };
    return Response.json(body);
  }

  private async handleUpdate(request: Request) {
    let payload: Partial<ImageMeta> & { id?: string };
    try {
      payload = (await request.json()) as Partial<ImageMeta> & { id?: string };
    } catch (_e) {
      return new Response('Invalid JSON', { status: 400 });
    }
    if (!payload.id) return new Response('Missing id', { status: 400 });

    const metaKey = `${META_PREFIX}${payload.id}`;
    const stored = await this.state.storage.get<ImageMeta & { filmStock?: string }>(metaKey);
    if (!stored) return new Response('Not found', { status: 404 });
    // Migrate legacy records: fold old filmStock into lens on read and drop
    // the old key so it disappears from storage after the first update.
    const { filmStock: legacyFilmStock, ...rest } = stored;
    const existing: ImageMeta = { ...rest, lens: rest.lens ?? legacyFilmStock };

    const legacy = payload as Partial<ImageMeta> & { filmStock?: string };
    const updated: ImageMeta = {
      ...existing,
      alt: payload.alt ?? existing.alt,
      name: payload.name ?? existing.name,
      width: payload.width ?? existing.width,
      height: payload.height ?? existing.height,
      placeholder: payload.placeholder ?? existing.placeholder,
      cameraBody: payload.cameraBody ?? existing.cameraBody,
      lens: payload.lens ?? legacy.filmStock ?? existing.lens,
      location: payload.location ?? existing.location,
      captureDate: normalizeCaptureDate(payload.captureDate ?? existing.captureDate),
      description:
        payload.description !== undefined
          ? payload.description.trim()
          : existing.description,
      tags: payload.tags !== undefined ? normalizeTags(payload.tags) : existing.tags,
      status: payload.status !== undefined ? normalizeStatus(payload.status) : normalizeStatus(existing.status),
      year: payload.year ?? existing.year,
    };

    await this.state.storage.put(metaKey, updated);
    return Response.json(updated);
  }

  private async handleGet(id: string) {
    const meta = await this.state.storage.get<ImageMeta>(`${META_PREFIX}${id}`);
    if (!meta) return new Response('Not found', { status: 404 });
    return Response.json(meta);
  }

  private async handleDelete(request: Request) {
    let payload: { id?: string };
    try {
      payload = (await request.json()) as { id?: string };
    } catch (_e) {
      return new Response('Invalid JSON', { status: 400 });
    }
    if (!payload.id) return new Response('Missing id', { status: 400 });

    const metaKey = `${META_PREFIX}${payload.id}`;
    const meta = await this.state.storage.get<ImageMeta>(metaKey);
    if (!meta) return new Response('Not found', { status: 404 });

    const order = ((await this.state.storage.get<string[]>(ORDER_KEY)) ?? []) as string[];
    const newOrder = order.filter((i) => i !== payload.id);

    await Promise.all([
      this.state.storage.delete(metaKey),
      this.state.storage.put(ORDER_KEY, newOrder),
    ]);

    return Response.json({ ok: true, removed: payload.id });
  }

  private async getMetaById(ids: string[]): Promise<Map<string, ImageMeta>> {
    const map = new Map<string, ImageMeta>();
    for (let i = 0; i < ids.length; i += META_READ_BATCH) {
      const chunk = ids.slice(i, i + META_READ_BATCH);
      const metas = await Promise.all(
        chunk.map((id) => this.state.storage.get<ImageMeta>(`${META_PREFIX}${id}`)),
      );
      chunk.forEach((id, j) => {
        const m = metas[j];
        if (m) map.set(id, m);
      });
    }
    return map;
  }

  private matchesQuery(m: ImageMeta, q: string): boolean {
    return (
      (m.alt?.toLowerCase().includes(q) ?? false) ||
      (m.name?.toLowerCase().includes(q) ?? false) ||
      (m.location?.toLowerCase().includes(q) ?? false) ||
      (m.cameraBody?.toLowerCase().includes(q) ?? false) ||
      (m.lens?.toLowerCase().includes(q) ?? false) ||
      (m.captureDate?.toLowerCase().includes(q) ?? false) ||
      (m.description?.toLowerCase().includes(q) ?? false) ||
      (m.year?.toLowerCase().includes(q) ?? false) ||
      (m.tags?.some((t) => t.includes(q)) ?? false) ||
      m.id.toLowerCase().includes(q)
    );
  }
}
