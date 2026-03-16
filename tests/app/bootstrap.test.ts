import type { ImageRecord } from '../../src/types';

const registerPlugin = vi.fn();
const gsapTo = vi.fn();
const gsapFrom = vi.fn();
const gsapFromTo = vi.fn();
const gsapKillTweens = vi.fn();
const gsapTimelineFrom = vi.fn();
const gsapTimelineTo = vi.fn();
const scrollRefresh = vi.fn();

vi.mock('imagesloaded', () => ({
  default: (_element: Element, callback?: () => void) => {
    callback?.();
    return { on: vi.fn() };
  },
}));

vi.mock('masonry-layout', () => ({
  default: class {
    layout() {}
    destroy() {}
  },
}));

vi.mock('lottie-web', () => ({
  default: {
    loadAnimation: () => ({
      destroy: vi.fn(),
    }),
  },
}));

vi.mock('gsap', () => ({
  default: {
    registerPlugin,
    to: gsapTo,
    from: gsapFrom,
    fromTo: gsapFromTo,
    killTweensOf: gsapKillTweens,
    timeline: vi.fn(() => ({
      from: gsapTimelineFrom.mockReturnThis(),
      to: gsapTimelineTo.mockReturnThis(),
    })),
    utils: {
      toArray: (selector: string) => Array.from(document.querySelectorAll(selector)),
    },
  },
}));

vi.mock('gsap/ScrollTrigger', () => ({
  ScrollTrigger: {
    refresh: scrollRefresh,
  },
}));

function createImage(id: string): ImageRecord {
  return {
    id,
    filename: `${id}.jpg`,
    slug: id,
    sourceHash: `${id}-hash`,
    width: 1000,
    height: 800,
    aspectRatio: 1.25,
    tags: [id, 'shared'],
    alt: `Image ${id}`,
    variants: {
      grid: {
        avif: `/${id}/grid-1200.avif`,
        webp: `/${id}/grid-1200.webp`,
        jpeg: `/${id}/grid-1200.jpg`,
        width: 1200,
        height: 960,
        sources: [
          { avif: `/${id}/grid-480.avif`, webp: `/${id}/grid-480.webp`, jpeg: `/${id}/grid-480.jpg`, width: 480, height: 384 },
          { avif: `/${id}/grid-800.avif`, webp: `/${id}/grid-800.webp`, jpeg: `/${id}/grid-800.jpg`, width: 800, height: 640 },
          { avif: `/${id}/grid-1200.avif`, webp: `/${id}/grid-1200.webp`, jpeg: `/${id}/grid-1200.jpg`, width: 1200, height: 960 },
        ],
      },
      lightbox: {
        avif: `/${id}/lightbox.avif`,
        webp: `/${id}/lightbox.webp`,
        jpeg: `/${id}/lightbox.jpg`,
        width: 1200,
        height: 900,
      },
      original: {
        url: `/${id}/original.jpg`,
        width: 1000,
        height: 800,
        mimeType: 'image/jpeg',
      },
    },
  };
}

describe('bootstrapPage', () => {
  beforeEach(() => {
    document.body.innerHTML = '<div id="app"></div>';
    document.body.className = '';
    window.scrollTo = vi.fn();
    window.innerWidth = 1280;
    window.innerHeight = 900;
    window.matchMedia = vi.fn().mockImplementation((query: string) => ({
      matches:
        query === '(max-width: 767px)'
          ? window.innerWidth <= 767
          : query === '(max-width: 1023px) and (orientation: landscape)'
            ? window.innerWidth <= 1023 && window.innerWidth > window.innerHeight
            : false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }));
    HTMLElement.prototype.scrollTo = vi.fn();
    vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => {
      callback(0);
      return 1;
    });
    vi.stubGlobal('cancelAnimationFrame', vi.fn());
  });

  afterEach(() => {
    vi.resetModules();
    vi.unstubAllGlobals();
  });

  it('renders the archive page, injects about html, and opens/closes the lightbox', async () => {
    const { bootstrapPage } = await import('../../src/lib/page');
    const images = Array.from({ length: 12 }, (_, index) => createImage(`archive-${index + 1}`));

    bootstrapPage({
      mode: 'archive',
      app: document.querySelector('#app') as HTMLElement,
      images,
      about: '<p>Hello 12</p>',
      random: () => 0.1,
    });

    expect(document.querySelectorAll('.imageGrid')).toHaveLength(12);
    expect(document.querySelector('.intro-copy')?.textContent).toContain('Hello 12');

    const firstImage = document.querySelector<HTMLElement>('.imageGrid');
    const overlay = document.querySelector<HTMLElement>('.lightbox-carousel');

    firstImage?.click();
    expect(overlay?.classList.contains('active')).toBe(true);
    expect(document.body.classList.contains('no-scroll')).toBe(true);

    overlay?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    expect(overlay?.classList.contains('active')).toBe(false);
    expect(document.body.classList.contains('no-scroll')).toBe(false);
  });

  it('appends a fresh archive pass after the masonry feed reaches the end', async () => {
    const { bootstrapPage } = await import('../../src/lib/page');
    const images = Array.from({ length: 4 }, (_, index) => createImage(`loop-${index + 1}`));

    bootstrapPage({
      mode: 'archive',
      app: document.querySelector('#app') as HTMLElement,
      images,
      about: '<p>Hello loop</p>',
      random: () => 0.1,
    });

    expect(document.querySelectorAll('.imageGrid')).toHaveLength(4);
    expect(document.querySelectorAll('.carousel-slide')).toHaveLength(4);

    Object.defineProperty(window, 'scrollY', {
      configurable: true,
      value: 1700,
    });
    Object.defineProperty(document.documentElement, 'scrollHeight', {
      configurable: true,
      value: 1900,
    });

    window.dispatchEvent(new Event('scroll'));

    expect(document.querySelectorAll('.imageGrid')).toHaveLength(8);
    expect(document.querySelectorAll('.carousel-slide')).toHaveLength(8);
    expect(scrollRefresh).toHaveBeenCalled();
  });

  it('renders selection mode with the dark-theme body class', async () => {
    const { bootstrapPage } = await import('../../src/lib/page');
    const images = Array.from({ length: 18 }, (_, index) => createImage(`selection-${index + 1}`));

    const result = bootstrapPage({
      mode: 'selection',
      app: document.querySelector('#app') as HTMLElement,
      images,
      about: '<p>Hello <a href="https://example.com">selection</a></p>',
      random: () => 0.2,
    });

    expect(document.body.classList.contains('page-selection')).toBe(true);
    expect(document.querySelectorAll('.imageGrid')).toHaveLength(6);
    expect(result.pageImages).toHaveLength(6);
    const aboutLink = document.querySelector('.intro-copy a') as HTMLAnchorElement;
    expect(aboutLink.target).toBe('_blank');
    expect(aboutLink.rel).toBe('noopener noreferrer');
  });

  it('sizes the selection grid from available viewport height on tablet and desktop', async () => {
    const { bootstrapPage } = await import('../../src/lib/page');
    const images = Array.from({ length: 18 }, (_, index) => createImage(`selection-grid-${index + 1}`));

    const headerHeight = 96;
    const app = document.querySelector('#app') as HTMLElement;

    bootstrapPage({
      mode: 'selection',
      app,
      images,
      about: '<p>Hello selection</p>',
      random: () => 0.2,
    });

    const header = document.querySelector('header') as HTMLElement;
    const main = document.querySelector('main') as HTMLElement;
    const grid = document.querySelector('main .inner') as HTMLElement;

    vi.spyOn(header, 'getBoundingClientRect').mockReturnValue({
      x: 0,
      y: 0,
      width: 1280,
      height: headerHeight,
      top: 0,
      right: 1280,
      bottom: headerHeight,
      left: 0,
      toJSON: () => ({}),
    });

    grid.style.gridTemplateColumns = 'repeat(3, minmax(0, 1fr))';
    grid.style.rowGap = '0px';

    window.dispatchEvent(new Event('resize'));

    expect(main.style.height).toBe(`${window.innerHeight - headerHeight}px`);
    expect(grid.style.getPropertyValue('--grid-row-unit')).toBe('402px');
  });

  it('lets the selection grid fall back to natural mobile height', async () => {
    const { bootstrapPage } = await import('../../src/lib/page');
    const images = Array.from({ length: 18 }, (_, index) => createImage(`selection-mobile-${index + 1}`));

    window.innerWidth = 390;

    bootstrapPage({
      mode: 'selection',
      app: document.querySelector('#app') as HTMLElement,
      images,
      about: '<p>Hello selection</p>',
      random: () => 0.2,
    });

    const main = document.querySelector('main') as HTMLElement;
    const grid = document.querySelector('main .inner') as HTMLElement;

    expect(main.style.height).toBe('');
    expect(grid.style.getPropertyValue('--grid-row-unit')).toBe('');
  });
});
