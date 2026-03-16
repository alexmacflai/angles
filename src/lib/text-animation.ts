import gsap from 'gsap';

function wrapLetters(word: string) {
  return word
    .split('')
    .map((letter) => `<span class="letter">${letter}</span>`)
    .join('');
}

function wrapTextContent(text: string) {
  return text
    .split(/(\s+)/)
    .filter((token) => token.length > 0)
    .map((token) => (/^\s+$/.test(token) ? token : `<span class="word">${wrapLetters(token)}</span>`))
    .join('');
}

function mergeTrailingPunctuation(paragraph: HTMLElement) {
  const words = Array.from(paragraph.querySelectorAll<HTMLElement>('.word'));

  words.forEach((word, index) => {
    if (!/^[,.;:!?]+$/.test(word.textContent ?? '')) {
      return;
    }

    const previousWord = words[index - 1];

    if (!previousWord) {
      return;
    }

    previousWord.append(...Array.from(word.childNodes));
    word.remove();
  });
}

function transformNodeContent(node: ChildNode): string {
  if (node.nodeType === Node.TEXT_NODE) {
    return wrapTextContent(node.textContent ?? '');
  }

  if (!(node instanceof HTMLElement)) {
    return '';
  }

  const clone = node.cloneNode(false) as HTMLElement;
  clone.innerHTML = Array.from(node.childNodes).map(transformNodeContent).join('');
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
    paragraph.innerHTML = Array.from(temp.childNodes).map(transformNodeContent).join('');
    mergeTrailingPunctuation(paragraph);
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
