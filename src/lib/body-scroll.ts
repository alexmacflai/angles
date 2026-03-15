let scrollPosition = 0;

export function lockBodyScroll() {
  scrollPosition = window.pageYOffset;
  document.body.classList.add('no-scroll');
  document.body.style.overflow = 'hidden';
  document.body.style.position = 'fixed';
  document.body.style.top = `-${scrollPosition}px`;
  document.body.style.width = '100%';
}

export function unlockBodyScroll() {
  document.body.classList.remove('no-scroll');
  document.body.style.removeProperty('overflow');
  document.body.style.removeProperty('position');
  document.body.style.removeProperty('top');
  document.body.style.removeProperty('width');
  window.scrollTo(0, scrollPosition);
}
