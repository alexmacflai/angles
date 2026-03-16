import { closeIcon, handIcon, logoIcon, wandIcon } from './icons';
import { withBasePath } from './base-path';
import { buildGridSlots } from './random';
import type { DecoratedImage, GridSlot, PageMode } from '../types';

function escapeHtml(value: string) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

export function getGridSizes(image: DecoratedImage, mode: PageMode) {
  if (mode === 'selection') {
    return '(max-width: 500px) 100vw, (max-width: 767px) 50vw, 33vw';
  }

  switch (image.sizeClass) {
    case 'tres':
      return '(max-width: 767px) 100vw, (max-width: 1279px) 75vw, 60vw';
    case 'dos':
      return '(max-width: 767px) 100vw, (max-width: 1279px) 50vw, 40vw';
    default:
      return '(max-width: 500px) 50vw, (max-width: 767px) 50vw, (max-width: 1279px) 25vw, 20vw';
  }
}

export function getLightboxSizes() {
  return '(max-width: 767px) calc(100vw - 2rem), (max-width: 1023px) calc(100vw - 3rem), calc(100vw - 4rem)';
}

function renderProgressivePicture({
  preview,
  full,
  alt,
  sizes,
  className = '',
}: {
  preview: { avif: string; jpeg: string; width: number; height: number };
  full: { avif: string; jpeg: string; width: number; height: number; avifSrcset?: string; jpegSrcset?: string };
  alt: string;
  sizes?: string;
  className?: string;
}) {
  const classes = ['progressive-picture', className].filter(Boolean).join(' ');

  return `
    <div class="${classes}" data-image-state="preview">
      <picture class="preview-picture">
        <source data-srcset="${preview.avif}" type="image/avif" />
        <img
          data-src="${preview.jpeg}"
          alt="${alt}"
          width="${preview.width}"
          height="${preview.height}"
          decoding="async"
        />
      </picture>
      <picture class="full-picture">
        <source data-srcset="${full.avifSrcset ?? full.avif}" ${sizes ? `data-sizes="${sizes}"` : ''} type="image/avif" />
        <img
          data-src="${full.jpeg}"
          ${full.jpegSrcset ? `data-srcset="${full.jpegSrcset}"` : ''}
          ${sizes ? `data-sizes="${sizes}"` : ''}
          alt="${alt}"
          width="${full.width}"
          height="${full.height}"
          decoding="async"
        />
      </picture>
    </div>
  `;
}

function renderGridPicture(image: DecoratedImage, sizes: string) {
  const alt = escapeHtml(image.alt || '');

  return renderProgressivePicture({
    preview: image.variants.grid.preview,
    full: {
      ...image.variants.grid,
      avifSrcset: image.variants.grid.sources.map((source) => `${source.avif} ${source.width}w`).join(', '),
      jpegSrcset: image.variants.grid.sources.map((source) => `${source.jpeg} ${source.width}w`).join(', '),
    },
    alt,
    sizes,
  });
}

function renderLightboxPicture(image: DecoratedImage) {
  const alt = escapeHtml(image.alt || '');

  return renderProgressivePicture({
    preview: image.variants.lightbox.preview,
    full: {
      ...image.variants.lightbox,
      avifSrcset: image.variants.lightbox.sources.map((source) => `${source.avif} ${source.width}w`).join(', '),
      jpegSrcset: image.variants.lightbox.sources.map((source) => `${source.jpeg} ${source.width}w`).join(', '),
    },
    alt,
    sizes: getLightboxSizes(),
    className: 'lightbox-progressive-picture',
  });
}

export function renderGridItem(image: DecoratedImage, mode: PageMode) {
  return `
    <button
      class="image imageGrid ${image.sizeClass}"
      data-image-index="${image.index}"
      aria-label="Open image ${image.index + 1} in lightbox"
    >
      ${renderGridPicture(image, getGridSizes(image, mode))}
    </button>
  `;
}

function renderGridGap(slot: GridSlot) {
  if (!('kind' in slot) || slot.kind !== 'gap') {
    return '';
  }

  return `
    <div
      class="image image-gap ${slot.sizeClass}"
      aria-hidden="true"
      data-gap-key="${slot.key}"
    ></div>
  `;
}

export function renderLightboxSlide(image: DecoratedImage) {
  return `
    <figure
      class="carousel-slide"
      data-image-index="${image.index}"
      data-image-slug="${image.slug}"
      style="--slide-width: ${image.variants.lightbox.width}; --slide-height: ${image.variants.lightbox.height};"
    >
      ${renderLightboxPicture(image)}
    </figure>
  `;
}

export function renderAllLightboxSlides(images: readonly DecoratedImage[]) {
  return images.map((image) => renderLightboxSlide(image)).join('');
}

export function renderGridMarkup(images: readonly DecoratedImage[], mode: PageMode, random = Math.random) {
  if (images.length === 0) {
    return `<p class="status-message">No images available yet.</p>`;
  }

  return buildGridSlots(images, mode, random)
    .map((slot) => ('kind' in slot ? renderGridGap(slot) : renderGridItem(slot, mode)))
    .join('');
}

export function createPageMarkup({
  mode,
  aboutHtml,
}: {
  mode: PageMode;
  aboutHtml: string;
}) {
  const selectionLabel = mode === 'archive' ? 'make a selection' : 'make another';
  const homeHref = import.meta.env.BASE_URL;
  const selectionHref = withBasePath('selection/');

  return `
    <div id="cursor" aria-hidden="true">
      <div class="cursor-player light"></div>
      <div class="cursor-player dark"></div>
    </div>
    <header id="header" role="banner">
      <div id="site-title" itemprop="publisher" itemscope itemtype="https://schema.org/Organization">
        <a href="${homeHref}" title="Angles" rel="home" itemprop="url">${logoIcon}</a>
      </div>
      <nav id="menu" role="navigation" itemscope itemtype="https://schema.org/SiteNavigationElement">
        <button class="nav-action intro-toggle" type="button">
          ${handIcon}
          <span class="label">who dis?</span>
        </button>
        <a class="nav-action selection-action" href="${selectionHref}">
          ${wandIcon}
          <span class="label">${selectionLabel}</span>
        </a>
      </nav>
      <div class="intro" aria-hidden="true">
        <div class="inner">
          <button class="nav-action intro-toggle intro-close" type="button">
            ${closeIcon}
            <span class="label">close</span>
          </button>
          <div class="intro-copy">${aboutHtml}</div>
        </div>
      </div>
    </header>
    <main class="grid" id="imageGrid">
      <div class="inner"></div>
    </main>
    <div class="lightbox-carousel" aria-hidden="true">
      <div class="carousel"></div>
    </div>
  `;
}
