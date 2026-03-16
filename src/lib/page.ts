import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

import { aboutHtml, images as allImages } from './content';
import { initCursor } from './cursor';
import { LightboxController } from './lightbox';
import { requestProgressivePicture } from './progressive-image';
import { decorateImages, shuffleItems } from './random';
import { createPageMarkup, renderGridMarkup } from './render';
import { selectImageCluster } from './selection';
import { initSmoothScroll } from './smooth-scroll';
import { lockBodyScroll, unlockBodyScroll } from './body-scroll';
import { playTextAnimation, prepareTextAnimation } from './text-animation';
import type { DecoratedImage, ImageRecord, PageMode } from '../types';

import '../styles.css';

gsap.registerPlugin(ScrollTrigger);

const GRID_PRELOAD_MARGIN = '300px 0px';

export interface BootstrapPageOptions {
  mode: PageMode;
  app?: HTMLElement;
  images?: readonly ImageRecord[];
  about?: string;
  random?: () => number;
}

export function buildPageImages(
  mode: PageMode,
  images: readonly ImageRecord[],
  random = Math.random
): DecoratedImage[] {
  const baseImages =
    mode === 'selection' ? selectImageCluster(images, { random }) : shuffleItems(images, random);

  return decorateImages(baseImages, random);
}

function initIntro(root: ParentNode) {
  const intro = root.querySelector<HTMLElement>('.intro');

  if (!intro) {
    return () => {};
  }

  intro.querySelectorAll<HTMLAnchorElement>('.intro-copy a[href]').forEach((link) => {
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
  });

  prepareTextAnimation(root);

  const toggleButtons = root.querySelectorAll<HTMLElement>('.intro-toggle');

  const toggleIntro = () => {
    const isActive = intro.classList.toggle('active');
    intro.setAttribute('aria-hidden', String(!isActive));

    if (isActive) {
      lockBodyScroll();
      playTextAnimation(root);
    } else {
      unlockBodyScroll();
    }
  };

  toggleButtons.forEach((button) => button.addEventListener('click', toggleIntro));

  return () => {
    toggleButtons.forEach((button) => button.removeEventListener('click', toggleIntro));
  };
}

function initGrid(root: ParentNode, mode: PageMode) {
  const main = root.querySelector<HTMLElement>('main');
  const grid = root.querySelector<HTMLElement>('main .inner');
  const header = root.querySelector<HTMLElement>('header');

  if (!main || !grid) {
    return {
      refresh() {},
      destroy() {},
    };
  }

  const cleanupHandlers: Array<() => void> = [];

  const countGridTracks = (template: string) => {
    const normalizedTemplate = template.trim();
    const repeatMatch = normalizedTemplate.match(/^repeat\((\d+),/);

    if (repeatMatch) {
      return Number(repeatMatch[1]);
    }

    if (!normalizedTemplate) {
      return 0;
    }

    let depth = 0;
    let tracks = 1;

    for (const character of normalizedTemplate) {
      if (character === '(') {
        depth += 1;
      } else if (character === ')') {
        depth = Math.max(depth - 1, 0);
      } else if (character === ' ' && depth === 0) {
        tracks += 1;
      }
    }

    return tracks;
  };

  const animateGridItems = (items: Iterable<HTMLElement>) => {
    Array.from(items).forEach((item) => {
      if (item.dataset.scrollAnimated === 'true') {
        return;
      }

      item.dataset.scrollAnimated = 'true';

      gsap.from(item, {
        opacity: 0,
        y: 120,
        scale: 0.75,
        duration: 0.8,
        scrollTrigger: {
          trigger: item,
          start: 'top bottom',
          end: 'bottom bottom',
          scrub: false,
          once: true,
        },
      });
    });
  };

  const updateDenseGridMetrics = () => {
    if (mode === 'selection') {
      const isMobile = window.matchMedia('(max-width: 767px)').matches;

      if (isMobile) {
        main.style.height = '';
        grid.style.removeProperty('--grid-row-unit');
        return;
      }

      const styles = window.getComputedStyle(grid);
      const columns = countGridTracks(styles.gridTemplateColumns);
      const gap = parseFloat(styles.rowGap || styles.gap || '0');
      const viewportHeight = window.innerHeight;
      const headerHeight = header?.getBoundingClientRect().height ?? 0;
      const mainHeight = Math.max(viewportHeight - headerHeight, 0);
      const rows = Math.ceil(grid.children.length / Math.max(columns, 1));
      const availableHeight = mainHeight - gap * Math.max(rows - 1, 0);
      const rowUnit = availableHeight / Math.max(rows, 1);

      main.style.height = `${mainHeight}px`;
      grid.style.setProperty('--grid-row-unit', `${Math.max(rowUnit, 0)}px`);
      return;
    }

    const styles = window.getComputedStyle(grid);
    const columns = countGridTracks(styles.gridTemplateColumns);
    const gap = parseFloat(styles.columnGap || '0');
    const availableWidth = grid.clientWidth - gap * Math.max(columns - 1, 0);
    const columnWidth = availableWidth / Math.max(columns, 1);

    grid.style.setProperty('--grid-row-unit', `${columnWidth}px`);
  };

  updateDenseGridMetrics();
  requestAnimationFrame(() => {
    updateDenseGridMetrics();
    gsap.to(main, {
      opacity: 1,
      duration: 1.6,
      y: 0,
    });
    animateGridItems(gsap.utils.toArray<HTMLElement>('.inner .image'));
  });

  const handleResize = () => updateDenseGridMetrics();
  window.addEventListener('resize', handleResize);
  cleanupHandlers.push(() => window.removeEventListener('resize', handleResize));

  return {
    refresh(newItems?: Iterable<HTMLElement>) {
      updateDenseGridMetrics();

      if (!newItems) {
        return;
      }

      requestAnimationFrame(() => {
        animateGridItems(newItems);
        ScrollTrigger.refresh();
      });
    },
    destroy() {
      cleanupHandlers.forEach((cleanup) => cleanup());
    },
  };
}

function getInitialBatchSize(mode: PageMode) {
  if (mode === 'selection') {
    return 6;
  }

  if (window.matchMedia('(max-width: 500px)').matches) {
    return 8;
  }

  if (window.matchMedia('(max-width: 767px)').matches) {
    return 6;
  }

  if (window.matchMedia('(max-width: 1279px)').matches) {
    return 12;
  }

  return 16;
}

function getBatchAppendSize(mode: PageMode) {
  if (mode === 'selection') {
    return 4;
  }

  if (window.matchMedia('(max-width: 767px)').matches) {
    return 6;
  }

  return 10;
}

function initProgressiveImages(root: ParentNode) {
  const progressivePictures = Array.from(root.querySelectorAll<HTMLElement>('.progressive-picture'));

  if (progressivePictures.length === 0) {
    return () => {};
  }

  const loadPicture = (picture: HTMLElement) => {
    void requestProgressivePicture(picture);
  };

  if (typeof IntersectionObserver === 'undefined') {
    progressivePictures.forEach(loadPicture);
    return () => {};
  }

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) {
          return;
        }

        observer.unobserve(entry.target);
        loadPicture(entry.target as HTMLElement);
      });
    },
    { rootMargin: GRID_PRELOAD_MARGIN }
  );

  progressivePictures.forEach((picture) => observer.observe(picture));

  return () => observer.disconnect();
}

function bindGridImage(
  image: HTMLElement,
  lightbox: LightboxController | null,
  cleanupHandlers: Array<() => void>
) {
  const grid = document.querySelector<HTMLElement>('main .inner');
  const index = Number(image.dataset.imageIndex);

  const handleClick = () => {
    lightbox?.open(index);
  };

  image.addEventListener('click', handleClick);
  cleanupHandlers.push(() => image.removeEventListener('click', handleClick));

  if (!lightbox) {
    return;
  }

  const handleEnter = () => {
    grid?.classList.add('hovering-image');
  };

  const handleLeave = () => {
    grid?.classList.remove('hovering-image');
  };

  image.addEventListener('mouseenter', handleEnter);
  image.addEventListener('mouseleave', handleLeave);

  cleanupHandlers.push(() => {
    image.removeEventListener('mouseenter', handleEnter);
    image.removeEventListener('mouseleave', handleLeave);
  });
}

function appendImageBatch({
  batch,
  mode,
  random,
  gridElement,
  lightbox,
  cleanupHandlers,
  gridCleanup,
  progressiveCleanupHandlers,
}: {
  batch: DecoratedImage[];
  mode: PageMode;
  random: () => number;
  gridElement: HTMLElement;
  lightbox: LightboxController | null;
  cleanupHandlers: Array<() => void>;
  gridCleanup: ReturnType<typeof initGrid>;
  progressiveCleanupHandlers: Array<() => void>;
}) {
  if (batch.length === 0) {
    return;
  }

  const startCount = gridElement.querySelectorAll('.imageGrid').length;
  gridElement.insertAdjacentHTML('beforeend', renderGridMarkup(batch, mode, random));
  const appendedImages = Array.from(gridElement.querySelectorAll<HTMLElement>('.imageGrid')).slice(startCount);

  appendedImages.forEach((image) => {
    bindGridImage(image, lightbox, cleanupHandlers);
  });

  progressiveCleanupHandlers.push(initProgressiveImages(gridElement));
  gridCleanup.refresh(appendedImages);
}

function preloadVisibleGridImages(images: readonly DecoratedImage[]) {
  images.slice(0, 2).forEach((image) => {
    const preload = document.createElement('link');
    preload.rel = 'preload';
    preload.as = 'image';
    preload.href = image.variants.grid.jpeg;
    preload.setAttribute(
      'imagesrcset',
      image.variants.grid.sources.map((source) => `${source.jpeg} ${source.width}w`).join(', ')
    );
    preload.setAttribute('imagesizes', '50vw');
    document.head.appendChild(preload);
  });
}

export function bootstrapPage({
  mode,
  app = document.querySelector<HTMLElement>('#app') ?? undefined,
  images = allImages,
  about = aboutHtml,
  random = Math.random,
}: BootstrapPageOptions) {
  if (!app) {
    throw new Error('Missing app root.');
  }

  const pageImages = buildPageImages(mode, images, random);
  document.body.classList.toggle('page-selection', mode === 'selection');
  document.body.classList.toggle('page-archive', mode === 'archive');
  document.title = mode === 'selection' ? 'Angles Selection' : 'Angles';

  app.innerHTML = createPageMarkup({
    mode,
    aboutHtml: about,
  });

  const introCleanup = initIntro(app);
  const cursorCleanup = initCursor(app);
  const smoothScrollCleanup = initSmoothScroll({
    shouldHandle: () => !document.body.classList.contains('no-scroll'),
  });
  const gridCleanup = initGrid(app, mode);
  const cleanupHandlers: Array<() => void> = [];
  const progressiveCleanupHandlers: Array<() => void> = [];

  const overlay = app.querySelector<HTMLElement>('.lightbox-carousel');
  const carousel = app.querySelector<HTMLElement>('.carousel');
  const lightbox = overlay && carousel ? new LightboxController(overlay, carousel, pageImages, mode) : null;
  const gridElement = app.querySelector<HTMLElement>('main .inner');

  if (!gridElement) {
    throw new Error('Missing grid root.');
  }

  let renderedCount = 0;
  const appendNextBatch = () => {
    const batchSize = renderedCount === 0 ? getInitialBatchSize(mode) : getBatchAppendSize(mode);
    const nextBatch = pageImages.slice(renderedCount, renderedCount + batchSize);

    if (nextBatch.length === 0) {
      return false;
    }

    appendImageBatch({
      batch: nextBatch,
      mode,
      random,
      gridElement,
      lightbox,
      cleanupHandlers,
      gridCleanup,
      progressiveCleanupHandlers,
    });
    renderedCount += nextBatch.length;
    return renderedCount < pageImages.length;
  };

  appendNextBatch();
  preloadVisibleGridImages(pageImages);

  if (mode === 'selection') {
    lightbox?.prewarmSelection();
  }

  if (mode === 'archive' && pageImages.length > renderedCount) {
    const sentinel = document.createElement('div');
    sentinel.className = 'grid-sentinel';
    sentinel.setAttribute('aria-hidden', 'true');
    gridElement.insertAdjacentElement('afterend', sentinel);

    if (typeof IntersectionObserver === 'undefined') {
      const handleScroll = () => {
        const scrollPosition = window.scrollY + window.innerHeight;
        const pageHeight = document.documentElement.scrollHeight;

        if (pageHeight - scrollPosition <= 512) {
          const hasMore = appendNextBatch();

          if (!hasMore) {
            window.removeEventListener('scroll', handleScroll);
          }
        }
      };

      window.addEventListener('scroll', handleScroll, { passive: true });
      cleanupHandlers.push(() => window.removeEventListener('scroll', handleScroll));
    } else {
      const observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (!entry.isIntersecting) {
              return;
            }

            const hasMore = appendNextBatch();

            if (!hasMore) {
              observer.disconnect();
              sentinel.remove();
            }
          });
        },
        { rootMargin: '600px 0px' }
      );

      observer.observe(sentinel);
      cleanupHandlers.push(() => observer.disconnect());
      cleanupHandlers.push(() => sentinel.remove());
    }
  }

  return {
    pageImages,
    destroy() {
      introCleanup();
      cursorCleanup();
      smoothScrollCleanup();
      cleanupHandlers.forEach((cleanup) => cleanup());
      progressiveCleanupHandlers.forEach((cleanup) => cleanup());
      gridCleanup.destroy();
      lightbox?.destroy();
    },
  };
}
