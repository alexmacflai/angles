export interface ImageVariant {
  avif: string;
  webp: string;
  jpeg: string;
  width: number;
  height: number;
}

export interface OriginalVariant {
  url: string;
  width: number;
  height: number;
  mimeType: string;
}

export interface ImageRecord {
  id: string;
  filename: string;
  slug: string;
  width: number;
  height: number;
  aspectRatio: number;
  tags: string[];
  alt: string;
  variants: {
    grid: ImageVariant;
    lightbox: ImageVariant;
    original: OriginalVariant;
  };
}

export type PageMode = 'archive' | 'selection';
export type SizeClass = 'uno' | 'dos' | 'tres';

export interface DecoratedImage extends ImageRecord {
  index: number;
  sizeClass: SizeClass;
}
