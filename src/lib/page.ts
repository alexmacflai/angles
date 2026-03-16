import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

import { aboutHtml, images as allImages } from './content';
import { initCursor } from './cursor';
import { LightboxController } from './lightbox';
import { decorateImages, shuffleItems } from './random';
import { createPageMarkup, renderGridMarkup, renderLightboxSlide } from './render';
import { selectImageCluster } from './selection';
import { initSmoothScroll } from './smooth-scroll';
import { lockBodyScroll, unlockBodyScroll } from './body-scroll';
import { playTextAnimation, prepareTextAnimation } from './text-animation';
import type { DecoratedImage, ImageRecord, PageMode } from '../types';

import '../styles.css';

gsap.registerPlugin(ScrollTrigger);

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
    const rowUnit = columnWidth;

    grid.style.setProperty('--grid-row-unit', `${rowUnit}px`);
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
    lightbox.centerOnIndex(index);
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

function decorateImageBatch(
  mode: PageMode,
  images: readonly ImageRecord[],
  startingIndex: number,
  random = Math.random
) {
  return buildPageImages(mode, images, random).map((image, index) => ({
    ...image,
    index: startingIndex + index,
  }));
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
    images: pageImages,
    aboutHtml: about,
    random,
  });

  const introCleanup = initIntro(app);
  const cursorCleanup = initCursor(app);
  const smoothScrollCleanup = initSmoothScroll({
    shouldHandle: () => !document.body.classList.contains('no-scroll'),
  });
  const gridCleanup = initGrid(app, mode);
  const cleanupHandlers: Array<() => void> = [];

  const overlay = app.querySelector<HTMLElement>('.lightbox-carousel');
  const carousel = app.querySelector<HTMLElement>('.carousel');
  const lightbox = overlay && carousel ? new LightboxController(overlay, carousel) : null;
  const gridElement = app.querySelector<HTMLElement>('main .inner');

  Array.from(app.querySelectorAll<HTMLElement>('.imageGrid')).forEach((image) => {
    bindGridImage(image, lightbox, cleanupHandlers);
  });

  if (mode === 'archive' && gridElement && carousel && images.length > 0) {
    let renderedCount = pageImages.length;
    let isAppending = false;
    const threshold = 256;

    const appendLoop = () => {
      if (isAppending) {
        return;
      }

      isAppending = true;

      const nextBatch = decorateImageBatch(mode, images, renderedCount, random);

      if (nextBatch.length === 0) {
        isAppending = false;
        return;
      }

      gridElement.insertAdjacentHTML(
        'beforeend',
        renderGridMarkup(nextBatch, mode, random)
      );
      carousel.insertAdjacentHTML(
        'beforeend',
        nextBatch.map((image) => renderLightboxSlide(image)).join('')
      );
      lightbox?.refreshSlides();

      const appendedImages = Array.from(gridElement.querySelectorAll<HTMLElement>('.imageGrid')).slice(
        renderedCount
      );

      appendedImages.forEach((image) => {
        bindGridImage(image, lightbox, cleanupHandlers);
      });

      renderedCount += nextBatch.length;
      gridCleanup.refresh(appendedImages);
      isAppending = false;
    };

    const maybeAppendLoop = () => {
      const scrollPosition = window.scrollY + window.innerHeight;
      const pageHeight = document.documentElement.scrollHeight;

      if (pageHeight - scrollPosition <= threshold) {
        appendLoop();
      }
    };

    window.addEventListener('scroll', maybeAppendLoop, { passive: true });
    cleanupHandlers.push(() => window.removeEventListener('scroll', maybeAppendLoop));
  }

  return {
    pageImages,
    destroy() {
      introCleanup();
      cursorCleanup();
      smoothScrollCleanup();
      cleanupHandlers.forEach((cleanup) => cleanup());
      gridCleanup.destroy();
      lightbox?.destroy();
    },
  };
}
