import gsap from 'gsap';

function wrapLetters(word: string) {
  return word
    .split('')
    .map((letter) => `<span class="letter">${letter}</span>`)
    .join('');
}

function transformNodeContent(node: ChildNode): string {
  if (node.nodeType === Node.TEXT_NODE) {
    const words = node.textContent?.trim().split(/\s+/).filter(Boolean) ?? [];

    return words.map((word) => `<span class="word">${wrapLetters(word)}</span>`).join(' ');
  }

  if (!(node instanceof HTMLElement)) {
    return '';
  }

  const clone = node.cloneNode(false) as HTMLElement;
  const words = node.textContent?.trim().split(/\s+/).filter(Boolean) ?? [];
  clone.innerHTML = words.map((word) => `<span class="word">${wrapLetters(word)}</span>`).join(' ');
  return clone.outerHTML;
}

export function prepareTextAnimation(root: ParentNode) {
  root.querySelectorAll('.intro-copy p').forEach((paragraph) => {
    paragraph.classList.add('text-animation');

    if (paragraph.getAttribute('data-letters-ready') === 'true') {
      return;
    }

    const temp = document.createElement('div');
    temp.innerHTML = paragraph.innerHTML;
    paragraph.innerHTML = Array.from(temp.childNodes).map(transformNodeContent).join(' ');
    paragraph.setAttribute('data-letters-ready', 'true');
  });
}

export function playTextAnimation(root: ParentNode) {
  const letters = root.querySelectorAll('.intro.active .text-animation .letter');

  if (letters.length === 0) {
    return;
  }

  gsap.killTweensOf(letters);
  gsap.fromTo(
    letters,
    { y: 50, opacity: 0 },
    {
      y: 0,
      opacity: 1,
      duration: 1.4,
      ease: 'expo.out',
      stagger: 0.004,
    }
  );
}
