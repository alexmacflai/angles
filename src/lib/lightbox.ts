import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

import { lockBodyScroll, unlockBodyScroll } from './body-scroll';

gsap.registerPlugin(ScrollTrigger);

export class LightboxController {
  private readonly overlay: HTMLElement;
  private readonly carousel: HTMLElement;
  private readonly slides: HTMLElement[];
  private isDragging = false;
  private wasDragged = false;
  private startX = 0;
  private scrollLeft = 0;
  private velocity = 0;
  private lastX = 0;
  private animationFrame = 0;
  private cleanupHandlers: Array<() => void> = [];

  constructor(overlay: HTMLElement, carousel: HTMLElement) {
    this.overlay = overlay;
    this.carousel = carousel;
    this.slides = Array.from(carousel.querySelectorAll<HTMLElement>('.carousel-slide'));

    this.initOverlay();
    this.initDrag();
    this.initScrollAnimations();
  }

  open(index: number) {
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
    unlockBodyScroll();
  }

  centerOnIndex(index: number) {
    if (!this.slides[index]) {
      return;
    }

    this.scrollToIndex(index, true);
  }

  destroy() {
    window.cancelAnimationFrame(this.animationFrame);
    this.cleanupHandlers.forEach((cleanup) => cleanup());
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

  private snapToClosestImage() {
    const carouselCenter = this.carousel.scrollLeft + this.carousel.offsetWidth / 2;
    let closestSlide: HTMLElement | null = null;
    let minDistance = Number.POSITIVE_INFINITY;

    for (const slide of this.slides) {
      const slideCenter = slide.offsetLeft + slide.offsetWidth / 2;
      const distance = Math.abs(carouselCenter - slideCenter);

      if (distance < minDistance) {
        closestSlide = slide;
        minDistance = distance;
      }
    }

    if (!closestSlide) {
      return;
    }

    const targetScroll =
      closestSlide.offsetLeft + closestSlide.offsetWidth / 2 - this.carousel.offsetWidth / 2;

    gsap.to(this.carousel, {
      scrollLeft: targetScroll,
      duration: 1,
      ease: 'power2.out',
    });
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
