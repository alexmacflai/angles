import lottie from 'lottie-web';

export function initCursor(root: ParentNode) {
  const cursor = root.querySelector<HTMLElement>('#cursor');

  if (!cursor) {
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
      path: '/assets/img/angles-cursor-eye-light.json',
    });

    cleanups.push(() => animation.destroy());
  }

  if (darkContainer) {
    const animation = lottie.loadAnimation({
      container: darkContainer,
      renderer: 'svg',
      loop: true,
      autoplay: true,
      path: '/assets/img/angles-cursor-eye-dark.json',
    });

    cleanups.push(() => animation.destroy());
  }

  const onMouseMove = (event: MouseEvent) => {
    cursor.style.left = `${event.clientX}px`;
    cursor.style.top = `${event.clientY}px`;
  };

  const onMouseDown = () => cursor.classList.add('pressed');
  const onMouseUp = () => cursor.classList.remove('pressed');

  const attachHoverState = (selector: string, className: 'hover' | 'eye') => {
    root.querySelectorAll<HTMLElement>(selector).forEach((element) => {
      const handleEnter = () => cursor.classList.add('hover', className);
      const handleLeave = () => cursor.classList.remove('hover', className);

      element.addEventListener('mouseenter', handleEnter);
      element.addEventListener('mouseleave', handleLeave);

      cleanups.push(() => {
        element.removeEventListener('mouseenter', handleEnter);
        element.removeEventListener('mouseleave', handleLeave);
      });
    });
  };

  document.addEventListener('mousemove', onMouseMove);
  document.addEventListener('mousedown', onMouseDown);
  document.addEventListener('mouseup', onMouseUp);

  attachHoverState('a, button, .carousel', 'hover');
  attachHoverState('.imageGrid', 'eye');

  cleanups.push(() => {
    document.removeEventListener('mousemove', onMouseMove);
    document.removeEventListener('mousedown', onMouseDown);
    document.removeEventListener('mouseup', onMouseUp);
  });

  return () => {
    cleanups.forEach((cleanup) => cleanup());
  };
}
