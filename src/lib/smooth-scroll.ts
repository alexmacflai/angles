interface SmoothScrollOptions {
  shouldHandle?: () => boolean;
}

export function initSmoothScroll({ shouldHandle }: SmoothScrollOptions = {}) {
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const desktopOnly = window.matchMedia('(min-width: 1024px)').matches;

  if (prefersReducedMotion || !desktopOnly) {
    return () => {};
  }

  let ease = 0.1;
  let currentScroll = window.pageYOffset;
  let targetScroll = window.pageYOffset;
  let previousScroll = currentScroll;
  let isScrolling = false;
  let animationFrame = 0;

  const limitScroll = () => {
    const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
    targetScroll = Math.max(0, Math.min(maxScroll, targetScroll));
  };

  const updateScroll = () => {
    currentScroll += (targetScroll - currentScroll) * ease;

    if (Math.abs(currentScroll - previousScroll) > 0.5) {
      window.scrollTo(0, currentScroll);
      previousScroll = currentScroll;
      animationFrame = window.requestAnimationFrame(updateScroll);
    } else {
      isScrolling = false;
    }
  };

  const onWheel = (event: WheelEvent) => {
    if (shouldHandle && !shouldHandle()) {
      return;
    }

    event.preventDefault();
    targetScroll += event.deltaY;
    limitScroll();

    if (!isScrolling) {
      animationFrame = window.requestAnimationFrame(updateScroll);
      isScrolling = true;
    }
  };

  window.addEventListener('wheel', onWheel, { passive: false });

  return () => {
    window.cancelAnimationFrame(animationFrame);
    window.removeEventListener('wheel', onWheel);
    ease = 0;
  };
}
