export type HeroAlign = 'left' | 'center' | 'right';

export type SiteThemeColors = {
  /** Heading/primary text color override, e.g. "#ffffff". Empty string = use theme default. */
  darkText: string;
  /** Page background color override for dark mode, e.g. "#000000". Empty string = use theme default. */
  darkBg: string;
  /** Heading/primary text color override for light mode. Empty string = use theme default. */
  lightText: string;
  /** Page background color override for light mode. Empty string = use theme default. */
  lightBg: string;
};

export type SiteMeta = {
  title: string;
  subtitle: string;
  contactEmail: string;
  /** CSS font-family stack for the hero title. Empty string = theme default (Epilogue). */
  titleFont: string;
  /** Hero title font size in rem, e.g. "8" → clamp(2.5rem, 10vw, 8rem). Empty string = default. */
  titleSize: string;
  /** Hero title font weight 400-900. 0 = theme default. */
  titleWeight: number;
  /** Hero title letter spacing in em, e.g. "-0.04". Empty string = default. */
  titleSpacing: string;
  /** Hero title text transform: none | uppercase | lowercase | capitalize. Empty string = default (uppercase). */
  titleTransform: string;
  /** Hero section text alignment. Empty string = center (default). */
  titleAlign: HeroAlign | '';
  /** Hero section vertical padding scale: "sm" | "md" | "lg" | "xl". Empty string = default (lg). */
  heroSize: '' | 'sm' | 'md' | 'lg' | 'xl';
  colors: SiteThemeColors;
};

export type Env = {
  IMAGES_BUCKET: R2Bucket;
  IMAGE_INDEX: DurableObjectNamespace;
  ACCESS_BYPASS_DEV?: string;
  ACCESS_TEAM_DOMAIN?: string;
  ACCESS_AUD?: string;
  R2_PUBLIC_HOST?: string;
  ADMIN_PATH?: string;
};

export type ImageMeta = {
  id: string;
  key: string;
  createdAt: string;
  size: number;
  contentType: string;
  width?: number;
  height?: number;
  alt?: string;
  name?: string;
  placeholder?: string;
  cameraBody?: string;
  filmStock?: string;
  location?: string;
  /** Date of capture, e.g. "2024-08-15" or free-form "August 2024". */
  captureDate?: string;
  /** Free-form description shown in the carousel. */
  description?: string;
  /** Lowercase tags used for filtering and quick-adding. */
  tags?: string[];
  year?: string;
  /** Visibility: 'active' (gallery, default), 'archive', or 'removed'. */
  status?: 'active' | 'archive' | 'removed';
};

export type ListResponse = {
  items: ImageMeta[];
  cursor?: string | null;
};

export type BulkMoveResponse = {
  ok: boolean;
  moved: string[];
  failed?: { id: string; error: string }[];
};

export type StatsResponse = {
  total: number;
  totalBytes: number;
  latestCreatedAt: string | null;
  avgSize: number;
};
