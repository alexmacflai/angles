// @vitest-environment jsdom

import type { DecoratedImage } from '../../src/types';

const requestPreviewPicture = vi.fn(() => Promise.resolve());
const requestFullPicture = vi.fn(() => Promise.resolve());
const cancelQueuedFullPictureRequests = vi.fn();
const deprioritizeFullPictureRequests = vi.fn();
const lockBodyScroll = vi.fn(() => document.body.classList.add('no-scroll'));
const unlockBodyScroll = vi.fn(() => document.body.classList.remove('no-scroll'));
const scrollRefresh = vi.fn();

vi.mock('gsap', () => ({
  default: {
    registerPlugin: vi.fn(),
    killTweensOf: vi.fn(),
    fromTo: vi.fn(),
    to: vi.fn(),
    timeline: vi.fn(() => ({
      from: vi.fn().mockReturnThis(),
      to: vi.fn().mockReturnThis(),
    })),
  },
}));

vi.mock('gsap/ScrollTrigger', () => ({
  ScrollTrigger: {
    refresh: scrollRefresh,
  },
}));

vi.mock('../../src/lib/progressive-image', () => ({
  requestPreviewPicture,
  requestFullPicture,
  cancelQueuedFullPictureRequests,
  deprioritizeFullPictureRequests,
}));

vi.mock('../../src/lib/body-scroll', () => ({
  lockBodyScroll,
  unlockBodyScroll,
}));

function createImage(index: number): DecoratedImage {
  const id = `image-${index}`;

  return {
    id,
    filename: `${id}.jpg`,
    slug: id,
    sourceHash: `${id}-hash`,
    width: 1200,
    height: 900,
    aspectRatio: 1.3333,
    tags: ['shared'],
    alt: id,
    index,
    sizeClass: 'uno',
    variants: {
      grid: {
        avif: `/${id}/grid.avif`,
        jpeg: `/${id}/grid.jpg`,
        width: 1200,
        height: 900,
        preview: {
          avif: `/${id}/grid-preview.avif`,
          jpeg: `/${id}/grid-preview.jpg`,
          width: 32,
          height: 24,
        },
        sources: [{ avif: `/${id}/grid.avif`, jpeg: `/${id}/grid.jpg`, width: 1200, height: 900 }],
      },
      lightbox: {
        avif: `/${id}/lightbox.avif`,
        jpeg: `/${id}/lightbox.jpg`,
        width: 1200,
        height: 900,
        sources: [
          { avif: `/${id}/lightbox-720.avif`, jpeg: `/${id}/lightbox-720.jpg`, width: 720, height: 540 },
          { avif: `/${id}/lightbox.avif`, jpeg: `/${id}/lightbox.jpg`, width: 1200, height: 900 },
        ],
        preview: {
          avif: `/${id}/lightbox-preview.avif`,
          jpeg: `/${id}/lightbox-preview.jpg`,
          width: 40,
          height: 30,
        },
      },
      original: {
        url: `/${id}/original.jpg`,
        width: 1200,
        height: 900,
        mimeType: 'image/jpeg',
      },
    },
  };
}

describe('LightboxController', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    document.body.innerHTML = `
      <div class="lightbox-carousel" aria-hidden="true">
        <div class="carousel"></div>
      </div>
    `;
    vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => {
      callback(0);
      return 1;
    });
    vi.stubGlobal('cancelAnimationFrame', vi.fn());
    requestPreviewPicture.mockClear();
    requestFullPicture.mockClear();
    cancelQueuedFullPictureRequests.mockClear();
    deprioritizeFullPictureRequests.mockClear();
    lockBodyScroll.mockClear();
    unlockBodyScroll.mockClear();
    scrollRefresh.mockClear();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it('requests only the active slide and nearby neighbors when opened', async () => {
    const { LightboxController } = await import('../../src/lib/lightbox');
    const overlay = document.querySelector('.lightbox-carousel') as HTMLElement;
    const carousel = document.querySelector('.carousel') as HTMLElement;
    const images = Array.from({ length: 12 }, (_, index) => createImage(index));

    const controller = new LightboxController(overlay, carousel, images, 'archive');
    controller.open(5);
    await vi.runAllTimersAsync();

    expect(document.querySelectorAll('.carousel-slide')).toHaveLength(12);
    expect(requestPreviewPicture).toHaveBeenCalledTimes(9);
    expect(requestFullPicture).toHaveBeenCalledTimes(9);
  });

  it('cancels queued active lightbox work when closed', async () => {
    const { LightboxController } = await import('../../src/lib/lightbox');
    const overlay = document.querySelector('.lightbox-carousel') as HTMLElement;
    const carousel = document.querySelector('.carousel') as HTMLElement;
    const images = Array.from({ length: 12 }, (_, index) => createImage(index));

    const controller = new LightboxController(overlay, carousel, images, 'archive');
    controller.open(4);
    controller.close();

    expect(cancelQueuedFullPictureRequests).toHaveBeenCalledWith('lightbox-active');
    expect(deprioritizeFullPictureRequests).toHaveBeenCalledWith('lightbox-active');
    expect(unlockBodyScroll).toHaveBeenCalled();
  });
});
