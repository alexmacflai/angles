import { closeIcon, handIcon, logoIcon, wandIcon } from './icons';
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

function getGridSizes(image: DecoratedImage, mode: PageMode) {
  if (mode === 'selection') {
    return '(max-width: 500px) 100vw, (max-width: 767px) 50vw, 33vw';
  }

  switch (image.sizeClass) {
    case 'tres':
      return '(max-width: 767px) 100vw, (max-width: 1279px) 75vw, 60vw';
    case 'dos':
      return '(max-width: 767px) 100vw, (max-width: 1279px) 50vw, 40vw';
    default:
      return '(max-width: 500px) 50vw, (max-width: 767px) 100vw, (max-width: 1279px) 25vw, 20vw';
  }
}

function renderPicture(
  image: DecoratedImage,
  variantKey: 'grid' | 'lightbox',
  loading: 'lazy' | 'eager',
  sizes?: string
) {
  const variant = image.variants[variantKey];
  const alt = escapeHtml(image.alt || '');
  const avifSrcset =
    variantKey === 'grid'
      ? image.variants.grid.sources.map((source) => `${source.avif} ${source.width}w`).join(', ')
      : variant.avif;
  const webpSrcset =
    variantKey === 'grid'
      ? image.variants.grid.sources.map((source) => `${source.webp} ${source.width}w`).join(', ')
      : variant.webp;
  const jpegSrcset =
    variantKey === 'grid'
      ? image.variants.grid.sources.map((source) => `${source.jpeg} ${source.width}w`).join(', ')
      : variant.jpeg;

  return `
    <picture>
      <source srcset="${avifSrcset}" ${sizes ? `sizes="${sizes}"` : ''} type="image/avif" />
      <source srcset="${webpSrcset}" ${sizes ? `sizes="${sizes}"` : ''} type="image/webp" />
      <img
        src="${variant.jpeg}"
        ${variantKey === 'grid' ? `srcset="${jpegSrcset}" sizes="${sizes}"` : ''}
        alt="${alt}"
        loading="${loading}"
        width="${variant.width}"
        height="${variant.height}"
        decoding="async"
      />
    </picture>
  `;
}

export function renderGridItem(image: DecoratedImage, mode: PageMode) {
  return `
    <button
      class="image imageGrid ${image.sizeClass}"
      data-image-index="${image.index}"
      aria-label="Open image ${image.index + 1} in lightbox"
    >
      ${renderPicture(image, 'grid', image.index < 6 ? 'eager' : 'lazy', getGridSizes(image, mode))}
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
    <figure class="carousel-slide" data-image-index="${image.index}">
      ${renderPicture(image, 'lightbox', 'lazy')}
    </figure>
  `;
}

export function renderGridMarkup(images: readonly DecoratedImage[], mode: PageMode, random = Math.random) {
  if (images.length === 0) {
    return `<p class="status-message">No images available yet.</p>`;
  }

  return buildGridSlots(images, mode, random)
    .map((slot) => ('kind' in slot ? renderGridGap(slot) : renderGridItem(slot, mode)))
    .join('');
}

function renderLightbox(images: readonly DecoratedImage[]) {
  return images.map((image) => renderLightboxSlide(image)).join('');
}

export function createPageMarkup({
  mode,
  images,
  aboutHtml,
  random = Math.random,
}: {
  mode: PageMode;
  images: readonly DecoratedImage[];
  aboutHtml: string;
  random?: () => number;
}) {
  const selectionLabel = mode === 'archive' ? 'make a selection' : 'make another';

  return `
    <div id="cursor" aria-hidden="true">
      <div class="cursor-player light"></div>
      <div class="cursor-player dark"></div>
    </div>
    <header id="header" role="banner">
      <div id="site-title" itemprop="publisher" itemscope itemtype="https://schema.org/Organization">
        <a href="/" title="Angles" rel="home" itemprop="url">${logoIcon}</a>
      </div>
      <nav id="menu" role="navigation" itemscope itemtype="https://schema.org/SiteNavigationElement">
        <button class="nav-action intro-toggle" type="button">
          ${handIcon}
          <span class="label">who dis?</span>
        </button>
        <a class="nav-action selection-action" href="/selection/">
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
      <div class="inner">${renderGridMarkup(images, mode, random)}</div>
    </main>
    <div class="lightbox-carousel" aria-hidden="true">
      <div class="carousel">${renderLightbox(images)}</div>
    </div>
  `;
}
