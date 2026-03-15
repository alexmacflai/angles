import { closeIcon, handIcon, logoIcon, wandIcon } from './icons';
import type { DecoratedImage, PageMode } from '../types';

function escapeHtml(value: string) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function renderPicture(
  image: DecoratedImage,
  variantKey: 'grid' | 'lightbox',
  loading: 'lazy' | 'eager'
) {
  const variant = image.variants[variantKey];
  const alt = escapeHtml(image.alt || '');

  return `
    <picture>
      <source srcset="${variant.avif}" type="image/avif" />
      <source srcset="${variant.webp}" type="image/webp" />
      <img
        src="${variant.jpeg}"
        alt="${alt}"
        loading="${loading}"
        width="${variant.width}"
        height="${variant.height}"
        decoding="async"
      />
    </picture>
  `;
}

function renderGrid(images: readonly DecoratedImage[]) {
  if (images.length === 0) {
    return `<p class="status-message">No images available yet.</p>`;
  }

  return `
    ${images
      .map(
        (image, index) => `
          <button
            class="image imageGrid ${image.sizeClass}"
            data-image-index="${index}"
            aria-label="Open image ${index + 1} in lightbox"
          >
            ${renderPicture(image, 'grid', index < 6 ? 'eager' : 'lazy')}
          </button>
        `
      )
      .join('')}
  `;
}

function renderLightbox(images: readonly DecoratedImage[]) {
  return images
    .map(
      (image, index) => `
        <figure class="carousel-slide" data-image-index="${index}">
          ${renderPicture(image, 'lightbox', 'lazy')}
        </figure>
      `
    )
    .join('');
}

export function createPageMarkup({
  mode,
  images,
  aboutHtml,
}: {
  mode: PageMode;
  images: readonly DecoratedImage[];
  aboutHtml: string;
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
      <div class="inner">${renderGrid(images)}</div>
    </main>
    <div class="lightbox-carousel" aria-hidden="true">
      <div class="carousel">${renderLightbox(images)}</div>
    </div>
  `;
}
