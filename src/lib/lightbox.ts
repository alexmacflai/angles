import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

import { lockBodyScroll, unlockBodyScroll } from './body-scroll';
import {
  cancelQueuedFullPictureRequests,
  deprioritizeFullPictureRequests,
  requestFullPicture,
  requestPreviewPicture,
} from './progressive-image';
import { renderAllLightboxSlides } from './render';
import type { DecoratedImage, PageMode } from '../types';

gsap.registerPlugin(ScrollTrigger);

const ARCHIVE_PRELOAD_RADIUS = 4;
const SELECTION_PRELOAD_RADIUS = 5;

export class LightboxController {
  private readonly overlay: HTMLElement;
  private readonly carousel: HTMLElement;
  private readonly images: readonly DecoratedImage[];
  private readonly mode: PageMode;
  private slides: HTMLElement[] = [];
  private isDragging = false;
  private wasDragged = false;
  private startX = 0;
  private scrollLeft = 0;
  private velocity = 0;
  private lastX = 0;
  private animationFrame = 0;
  private cleanupHandlers: Array<() => void> = [];
  private currentIndex = 0;
  private isRendered = false;
  private preloadTimeout = 0;
  private rangeTimeouts = new Set<number>();
  private suppressClickClose = false;

  constructor(
    overlay: HTMLElement,
    carousel: HTMLElement,
    images: readonly DecoratedImage[],
    mode: PageMode
  ) {
    this.overlay = overlay;
    this.carousel = carousel;
    this.images = images;
    this.mode = mode;

    this.initOverlay();
    this.initDrag();
    this.initScrollTracking();
  }

  open(index: number) {
    cancelQueuedFullPictureRequests('lightbox-background');
    this.currentIndex = index;
    this.ensureRendered();
    this.overlay.classList.add('active');
    this.overlay.setAttribute('aria-hidden', 'false');
    lockBodyScroll();

    gsap.killTweensOf(this.carousel);
    gsap.fromTo(this.carousel, { opacity: 0.2 }, { opacity: 1, duration: 0.6, ease: 'power2.out' });

    this.requestRange(index);

    requestAnimationFrame(() => {
      this.scrollToIndex(index, false);
      ScrollTrigger.refresh();
    });
  }

  close() {
    this.clearRangeTimeouts();
    cancelQueuedFullPictureRequests('lightbox-active');
    deprioritizeFullPictureRequests('lightbox-active');
    this.overlay.classList.remove('active');
    this.overlay.setAttribute('aria-hidden', 'true');
    unlockBodyScroll();

    if (this.mode === 'selection') {
      this.prewarmSelection();
    }
  }

  prewarmSelection() {
    if (this.mode !== 'selection') {
      return;
    }

    window.clearTimeout(this.preloadTimeout);
    this.preloadTimeout = window.setTimeout(() => {
      this.ensureRendered();

      this.images.forEach((image) => {
        const slide = this.slides[image.index];
        const picture = slide?.querySelector<HTMLElement>('.progressive-picture');

        if (!picture) {
          return;
        }

        void requestPreviewPicture(picture, { priority: 'low' });
        void requestFullPicture(picture, {
          previewPriority: 'low',
          priority: 'low',
          source: 'lightbox-background',
        });
      });
    }, 600);
  }

  destroy() {
    window.cancelAnimationFrame(this.animationFrame);
    window.clearTimeout(this.preloadTimeout);
    this.clearRangeTimeouts();
    this.cleanupHandlers.forEach((cleanup) => cleanup());
  }

  private ensureRendered() {
    if (this.isRendered) {
      return;
    }

    this.carousel.innerHTML = renderAllLightboxSlides(this.images);
    this.slides = Array.from(this.carousel.querySelectorAll<HTMLElement>('.carousel-slide'));
    this.isRendered = true;
    this.initScrollAnimations();
  }

  private requestRange(centerIndex: number) {
    const radius = this.mode === 'selection' ? SELECTION_PRELOAD_RADIUS : ARCHIVE_PRELOAD_RADIUS;
    const indices: number[] = [centerIndex];

    for (let offset = 1; offset <= radius; offset += 1) {
      if (centerIndex - offset >= 0) {
        indices.push(centerIndex - offset);
      }

      if (centerIndex + offset < this.images.length) {
        indices.push(centerIndex + offset);
      }
    }

    this.clearRangeTimeouts();

    indices.forEach((index, order) => {
      const previewPriority = order === 0 ? 'high' : order <= 2 ? 'auto' : 'low';
      const fullPriority = order === 0 ? 'high' : order <= 2 ? 'auto' : 'low';

      const timeoutId = window.setTimeout(() => {
        this.rangeTimeouts.delete(timeoutId);
        void this.requestIndex(index, previewPriority, fullPriority);
      }, order * 60);

      this.rangeTimeouts.add(timeoutId);
    });
  }

  private async requestIndex(index: number, previewPriority: 'high' | 'auto' | 'low', priority: 'high' | 'auto' | 'low') {
    const slide = this.slides[index];
    const picture = slide?.querySelector<HTMLElement>('.progressive-picture');

    if (!picture) {
      return;
    }

    await requestPreviewPicture(picture, { priority: previewPriority });
    await requestFullPicture(picture, {
      previewPriority,
      priority,
      source: 'lightbox-active',
    });
  }

  private clearRangeTimeouts() {
    this.rangeTimeouts.forEach((timeoutId) => window.clearTimeout(timeoutId));
    this.rangeTimeouts.clear();
  }

  private scrollToIndex(index: number, smooth: boolean) {
    const slide = this.slides[index];

    if (!slide) {
      return;
    }

    const targetScroll = slide.offsetLeft + slide.clientWidth / 2 - this.carousel.clientWidth / 2;

    if (!smooth) {
      this.carousel.scrollLeft = targetScroll;
      return;
    }

    this.carousel.scrollTo({ left: targetScroll, behavior: 'smooth' });
  }

  private getClosestIndex() {
    const carouselCenter = this.carousel.scrollLeft + this.carousel.offsetWidth / 2;
    let closestIndex = this.currentIndex;
    let minDistance = Number.POSITIVE_INFINITY;

    this.slides.forEach((slide, index) => {
      const slideCenter = slide.offsetLeft + slide.offsetWidth / 2;
      const distance = Math.abs(carouselCenter - slideCenter);

      if (distance < minDistance) {
        minDistance = distance;
        closestIndex = index;
      }
    });

    return closestIndex;
  }

  private updateCurrentIndex() {
    const nextIndex = this.getClosestIndex();

    if (nextIndex === this.currentIndex) {
      return;
    }

    this.currentIndex = nextIndex;
    this.requestRange(nextIndex);
  }

  private snapToClosestImage() {
    const closestIndex = this.getClosestIndex();
    this.currentIndex = closestIndex;
    this.requestRange(closestIndex);
    gsap.killTweensOf(this.carousel);
    gsap.to(this.carousel, {
      scrollLeft: this.getTargetScroll(closestIndex),
      duration: 0.36,
      ease: 'power3.out',
    });
  }

  private getTargetScroll(index: number) {
    const slide = this.slides[index];

    if (!slide) {
      return this.carousel.scrollLeft;
    }

    return slide.offsetLeft + slide.clientWidth / 2 - this.carousel.clientWidth / 2;
  }

  private animateMomentum = () => {
    if (this.isDragging) {
      return;
    }

    this.carousel.scrollLeft += this.velocity;
    const speed = Math.abs(this.velocity);
    this.velocity *= speed > 20 ? 0.9 : speed > 10 ? 0.84 : 0.74;
    this.updateCurrentIndex();

    if (Math.abs(this.velocity) > 1.2) {
      this.animationFrame = window.requestAnimationFrame(this.animateMomentum);
    } else {
      this.snapToClosestImage();
    }
  };

  private initOverlay() {
    const handleOverlayClick = () => {
      if (this.suppressClickClose) {
        this.suppressClickClose = false;
        return;
      }

      this.close();
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && this.overlay.classList.contains('active')) {
        this.close();
      }
    };

    this.overlay.addEventListener('click', handleOverlayClick);
    document.addEventListener('keydown', handleEscape);
    this.cleanupHandlers.push(() => this.overlay.removeEventListener('click', handleOverlayClick));
    this.cleanupHandlers.push(() => document.removeEventListener('keydown', handleEscape));
  }

  private initDrag() {
    const handlePointerDown = (event: PointerEvent) => {
      this.isDragging = true;
      this.wasDragged = false;
      this.startX = event.clientX - this.carousel.offsetLeft;
      this.scrollLeft = this.carousel.scrollLeft;
      this.lastX = event.clientX;
      this.velocity = 0;
      this.suppressClickClose = false;
      this.carousel.setPointerCapture(event.pointerId);
      gsap.killTweensOf(this.carousel);
      window.cancelAnimationFrame(this.animationFrame);
      document.body.classList.add('lightbox-dragging');
    };

    const handlePointerMove = (event: PointerEvent) => {
      if (!this.isDragging) {
        return;
      }

      this.wasDragged = true;
      const positionX = event.clientX - this.carousel.offsetLeft;
      const deltaX = positionX - this.lastX;
      this.velocity = deltaX * -1;
      this.lastX = positionX;
      this.carousel.scrollLeft = this.scrollLeft - (positionX - this.startX);
      this.updateCurrentIndex();

      if (Math.abs(positionX - this.startX) > 6) {
        this.suppressClickClose = true;
      }
    };

    const endDrag = () => {
      if (!this.isDragging) {
        return;
      }

      this.isDragging = false;
      document.body.classList.remove('lightbox-dragging');
      this.updateCurrentIndex();

      if (Math.abs(this.velocity) < 2.5) {
        this.snapToClosestImage();
        return;
      }

      this.animationFrame = window.requestAnimationFrame(this.animateMomentum);
    };

    const handleClickCapture = (event: MouseEvent) => {
      if (!this.wasDragged) {
        return;
      }

      event.preventDefault();
      event.stopPropagation();
      this.wasDragged = false;
    };

    this.carousel.addEventListener('pointerdown', handlePointerDown);
    this.carousel.addEventListener('pointermove', handlePointerMove);
    this.carousel.addEventListener('pointerup', endDrag);
    this.carousel.addEventListener('pointercancel', endDrag);
    this.carousel.addEventListener('pointerleave', endDrag);
    this.carousel.addEventListener('click', handleClickCapture, true);

    this.cleanupHandlers.push(() => {
      document.body.classList.remove('lightbox-dragging');
      this.carousel.removeEventListener('pointerdown', handlePointerDown);
      this.carousel.removeEventListener('pointermove', handlePointerMove);
      this.carousel.removeEventListener('pointerup', endDrag);
      this.carousel.removeEventListener('pointercancel', endDrag);
      this.carousel.removeEventListener('pointerleave', endDrag);
      this.carousel.removeEventListener('click', handleClickCapture, true);
    });
  }

  private initScrollTracking() {
    const handleScroll = () => {
      if (!this.overlay.classList.contains('active')) {
        return;
      }

      this.updateCurrentIndex();
    };

    this.carousel.addEventListener('scroll', handleScroll, { passive: true });
    this.cleanupHandlers.push(() => this.carousel.removeEventListener('scroll', handleScroll));
  }

  private initScrollAnimations() {
    this.slides.forEach((slide) => {
      if (slide.dataset.scrollAnimated === 'true') {
        return;
      }

      slide.dataset.scrollAnimated = 'true';

      const timeline = gsap.timeline({
        scrollTrigger: {
          trigger: slide,
          scroller: this.carousel,
          start: 'left right',
          end: 'right left',
          scrub: true,
          horizontal: true,
        },
      });

      timeline
        .from(slide, {
          opacity: 0.25,
          x: 120,
          scale: 0.8,
          duration: 1,
        })
        .to(
          slide,
          {
            opacity: 0.25,
            x: -120,
            scale: 0.8,
            duration: 1,
          },
          '+=0.1'
        );
    });
  }
}
