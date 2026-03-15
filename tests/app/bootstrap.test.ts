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
        avif: `/${id}/grid.avif`,
        webp: `/${id}/grid.webp`,
        jpeg: `/${id}/grid.jpg`,
        width: 900,
        height: 900,
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
    window.matchMedia = vi.fn().mockImplementation((query: string) => ({
      matches: query.includes('min-width') ? false : false,
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

  it('renders selection mode with the dark-theme body class', async () => {
    const { bootstrapPage } = await import('../../src/lib/page');
    const images = Array.from({ length: 18 }, (_, index) => createImage(`selection-${index + 1}`));

    const result = bootstrapPage({
      mode: 'selection',
      app: document.querySelector('#app') as HTMLElement,
      images,
      about: '<p>Hello selection</p>',
      random: () => 0.2,
    });

    expect(document.body.classList.contains('page-selection')).toBe(true);
    expect(document.querySelectorAll('.imageGrid')).toHaveLength(6);
    expect(result.pageImages).toHaveLength(6);
  });
});
