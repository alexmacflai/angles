import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

import { lockBodyScroll, unlockBodyScroll } from './body-scroll';
import { renderLightboxSlide } from './render';
import type { DecoratedImage } from '../types';

gsap.registerPlugin(ScrollTrigger);

const WINDOW_RADIUS = 2;

export class LightboxController {
  private readonly overlay: HTMLElement;
  private readonly carousel: HTMLElement;
  private readonly images: readonly DecoratedImage[];
  private slides: HTMLElement[];
  private isDragging = false;
  private wasDragged = false;
  private startX = 0;
  private scrollLeft = 0;
  private velocity = 0;
  private lastX = 0;
  private animationFrame = 0;
  private cleanupHandlers: Array<() => void> = [];
  private currentIndex = 0;
  private renderedStart = -1;
  private renderedEnd = -1;

  constructor(overlay: HTMLElement, carousel: HTMLElement, images: readonly DecoratedImage[]) {
    this.overlay = overlay;
    this.carousel = carousel;
    this.images = images;
    this.slides = [];

    this.initOverlay();
    this.initDrag();
  }

  open(index: number) {
    this.currentIndex = index;
    this.renderWindow(index);
    this.overlay.classList.add('active');
    this.overlay.setAttribute('aria-hidden', 'false');
    lockBodyScroll();

    gsap.killTweensOf(this.carousel);
    gsap.fromTo(this.carousel, { opacity: 0.2 }, { opacity: 1, duration: 0.6, ease: 'power2.out' });

    requestAnimationFrame(() => {
      this.scrollToIndex(index, false);
      ScrollTrigger.refresh();
    });
  }

  close() {
    this.overlay.classList.remove('active');
    this.overlay.setAttribute('aria-hidden', 'true');
    this.carousel.innerHTML = '';
    this.slides = [];
    this.renderedStart = -1;
    this.renderedEnd = -1;
    unlockBodyScroll();
  }

  centerOnIndex(_index: number) {}

  destroy() {
    window.cancelAnimationFrame(this.animationFrame);
    this.cleanupHandlers.forEach((cleanup) => cleanup());
  }

  private renderWindow(centerIndex: number) {
    const start = Math.max(0, centerIndex - WINDOW_RADIUS);
    const end = Math.min(this.images.length - 1, centerIndex + WINDOW_RADIUS);

    if (start === this.renderedStart && end === this.renderedEnd) {
      return;
    }

    this.renderedStart = start;
    this.renderedEnd = end;
    this.carousel.innerHTML = this.images.slice(start, end + 1).map((image) => renderLightboxSlide(image)).join('');
    this.slides = Array.from(this.carousel.querySelectorAll<HTMLElement>('.carousel-slide'));
    this.initScrollAnimations();
  }

  private scrollToIndex(index: number, smooth: boolean) {
    const slide = this.carousel.querySelector<HTMLElement>(`.carousel-slide[data-image-index="${index}"]`);

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

  private updateWindowAroundClosestSlide() {
    const closestIndex = this.getClosestIndex();

    if (closestIndex === null || closestIndex === this.currentIndex) {
      return;
    }

    this.currentIndex = closestIndex;
    this.renderWindow(closestIndex);
    this.scrollToIndex(closestIndex, false);
    ScrollTrigger.refresh();
  }

  private getClosestIndex() {
    const carouselCenter = this.carousel.scrollLeft + this.carousel.offsetWidth / 2;
    let closestIndex: number | null = null;
    let minDistance = Number.POSITIVE_INFINITY;

    for (const slide of this.slides) {
      const slideCenter = slide.offsetLeft + slide.offsetWidth / 2;
      const distance = Math.abs(carouselCenter - slideCenter);
      const slideIndex = Number(slide.dataset.imageIndex);

      if (distance < minDistance) {
        closestIndex = slideIndex;
        minDistance = distance;
      }
    }

    return closestIndex;
  }

  private snapToClosestImage() {
    const closestIndex = this.getClosestIndex();

    if (closestIndex === null) {
      return;
    }

    this.currentIndex = closestIndex;
    this.renderWindow(closestIndex);
    this.scrollToIndex(closestIndex, true);
  }

  private animateMomentum = () => {
    if (this.isDragging) {
      return;
    }

    this.carousel.scrollLeft += this.velocity;
    this.velocity *= 0.95;

    if (Math.abs(this.velocity) > 0.5) {
      this.animationFrame = window.requestAnimationFrame(this.animateMomentum);
    } else {
      this.snapToClosestImage();
    }
  };

  private initOverlay() {
    const handleOverlayClick = () => {
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
      this.carousel.setPointerCapture(event.pointerId);
      gsap.killTweensOf(this.carousel);
      window.cancelAnimationFrame(this.animationFrame);
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
    };

    const endDrag = () => {
      if (!this.isDragging) {
        return;
      }

      this.isDragging = false;
      this.updateWindowAroundClosestSlide();
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
      this.carousel.removeEventListener('pointerdown', handlePointerDown);
      this.carousel.removeEventListener('pointermove', handlePointerMove);
      this.carousel.removeEventListener('pointerup', endDrag);
      this.carousel.removeEventListener('pointercancel', endDrag);
      this.carousel.removeEventListener('pointerleave', endDrag);
      this.carousel.removeEventListener('click', handleClickCapture, true);
    });
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
