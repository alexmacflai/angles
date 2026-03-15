import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

import { aboutHtml, images as allImages } from './content';
import { initCursor } from './cursor';
import { LightboxController } from './lightbox';
import { decorateImages, shuffleItems } from './random';
import { createPageMarkup } from './render';
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

  if (!main || !grid) {
    return () => {};
  }

  const cleanupHandlers: Array<() => void> = [];

  const setupAnimations = () => {
    gsap.to(main, {
      opacity: 1,
      duration: 1.6,
      y: 0,
    });

    gsap.utils.toArray<HTMLElement>('.inner .image').forEach((item) => {
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
    const styles = window.getComputedStyle(grid);
    const columns = styles.gridTemplateColumns.split(' ').filter(Boolean).length;
    const gap = parseFloat(styles.columnGap || '0');
    const availableWidth = grid.clientWidth - gap * Math.max(columns - 1, 0);
    const columnWidth = availableWidth / Math.max(columns, 1);
    const rowUnit = mode === 'selection' ? columnWidth * 0.75 : columnWidth;

    grid.style.setProperty('--grid-row-unit', `${rowUnit}px`);
  };

  updateDenseGridMetrics();
  requestAnimationFrame(() => {
    updateDenseGridMetrics();
    setupAnimations();
  });

  const handleResize = () => updateDenseGridMetrics();
  window.addEventListener('resize', handleResize);
  cleanupHandlers.push(() => window.removeEventListener('resize', handleResize));

  if (mode === 'selection') {
    main.style.paddingTop = '0';
  }

  return () => {
    cleanupHandlers.forEach((cleanup) => cleanup());
  };
}

function bindGridHover(gridImages: HTMLElement[], lightbox: LightboxController) {
  const cleanupHandlers: Array<() => void> = [];
  const grid = document.querySelector<HTMLElement>('main .inner');

  gridImages.forEach((image) => {
    const index = Number(image.dataset.imageIndex);

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
  });

  return () => cleanupHandlers.forEach((cleanup) => cleanup());
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
  });

  const introCleanup = initIntro(app);
  const cursorCleanup = initCursor(app);
  const smoothScrollCleanup = initSmoothScroll({
    shouldHandle: () => !document.body.classList.contains('no-scroll'),
  });
  const gridCleanup = initGrid(app, mode);

  const overlay = app.querySelector<HTMLElement>('.lightbox-carousel');
  const carousel = app.querySelector<HTMLElement>('.carousel');
  const gridImages = Array.from(app.querySelectorAll<HTMLElement>('.imageGrid'));
  const lightbox = overlay && carousel ? new LightboxController(overlay, carousel) : null;
  const hoverCleanup = lightbox ? bindGridHover(gridImages, lightbox) : () => {};

  gridImages.forEach((image) => {
    image.addEventListener('click', () => {
      lightbox?.open(Number(image.dataset.imageIndex));
    });
  });

  return {
    pageImages,
    destroy() {
      introCleanup();
      cursorCleanup();
      smoothScrollCleanup();
      gridCleanup();
      hoverCleanup();
      lightbox?.destroy();
    },
  };
}
