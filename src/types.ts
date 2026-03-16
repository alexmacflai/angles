export interface ImageVariant {
  avif: string;
  jpeg: string;
  width: number;
  height: number;
}

export interface ResponsiveImageVariant extends ImageVariant {
  sources: ImageVariant[];
  preview: ImageVariant;
}

export interface LightboxImageVariant extends ImageVariant {
  sources: ImageVariant[];
  preview: ImageVariant;
}

export interface OriginalVariant {
  url: string;
  width: number;
  height: number;
  mimeType: string;
}

export interface SelectionIndexRecord {
  id: string;
  tags: string[];
}

export interface ImageRecord extends SelectionIndexRecord {
  id: string;
  filename: string;
  slug: string;
  sourceHash: string;
  width: number;
  height: number;
  aspectRatio: number;
  tags: string[];
  alt: string;
  variants: {
    grid: ResponsiveImageVariant;
    lightbox: LightboxImageVariant;
    original: OriginalVariant;
  };
}

export type PageMode = 'archive' | 'selection';
export type SizeClass = 'uno' | 'dos' | 'tres';

export interface DecoratedImage extends ImageRecord {
  index: number;
  sizeClass: SizeClass;
}

export interface GridGap {
  kind: 'gap';
  key: string;
  sizeClass: SizeClass;
}

export type GridSlot = DecoratedImage | GridGap;
