import lottie from 'lottie-web';
import { withBasePath } from './base-path';

function supportsCustomCursor() {
  return window.matchMedia('(hover: hover) and (pointer: fine)').matches;
}

function matchesHoverTarget(target: EventTarget | null, selector: string) {
  return target instanceof Element ? target.closest(selector) : null;
}

export function initCursor(root: ParentNode) {
  const cursor = root.querySelector<HTMLElement>('#cursor');

  if (!cursor || !supportsCustomCursor()) {
    return () => {};
  }

  const lightContainer = cursor.querySelector<HTMLElement>('.cursor-player.light');
  const darkContainer = cursor.querySelector<HTMLElement>('.cursor-player.dark');
  const cleanups: Array<() => void> = [];

  if (lightContainer) {
    const animation = lottie.loadAnimation({
      container: lightContainer,
      renderer: 'svg',
      loop: true,
      autoplay: true,
      path: withBasePath('assets/img/angles-cursor-eye-light.json'),
    });

    cleanups.push(() => animation.destroy());
  }

  if (darkContainer) {
    const animation = lottie.loadAnimation({
      container: darkContainer,
      renderer: 'svg',
      loop: true,
      autoplay: true,
      path: withBasePath('assets/img/angles-cursor-eye-dark.json'),
    });

    cleanups.push(() => animation.destroy());
  }

  const setState = (target: EventTarget | null) => {
    cursor.classList.toggle('hover', Boolean(matchesHoverTarget(target, 'a, button, .carousel')));
    cursor.classList.toggle('eye', Boolean(matchesHoverTarget(target, '.imageGrid')));
  };

  const onMouseMove = (event: MouseEvent) => {
    cursor.style.left = `${event.clientX}px`;
    cursor.style.top = `${event.clientY}px`;
    setState(event.target);
  };

  const onMouseOver = (event: MouseEvent) => {
    setState(event.target);
  };

  const onMouseOut = (event: MouseEvent) => {
    setState(event.relatedTarget);
  };

  const onMouseDown = () => cursor.classList.add('pressed');
  const onMouseUp = () => cursor.classList.remove('pressed');

  document.addEventListener('mousemove', onMouseMove);
  document.addEventListener('mouseover', onMouseOver);
  document.addEventListener('mouseout', onMouseOut);
  document.addEventListener('mousedown', onMouseDown);
  document.addEventListener('mouseup', onMouseUp);

  cleanups.push(() => {
    document.removeEventListener('mousemove', onMouseMove);
    document.removeEventListener('mouseover', onMouseOver);
    document.removeEventListener('mouseout', onMouseOut);
    document.removeEventListener('mousedown', onMouseDown);
    document.removeEventListener('mouseup', onMouseUp);
  });

  return () => {
    cleanups.forEach((cleanup) => cleanup());
  };
}
