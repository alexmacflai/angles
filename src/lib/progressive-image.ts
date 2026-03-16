function applyDeferredSource(picture: HTMLElement) {
  const image = picture.querySelector<HTMLImageElement>('img');

  picture.querySelectorAll<HTMLSourceElement>('source').forEach((source) => {
    const srcset = source.dataset.srcset;
    const sizes = source.dataset.sizes;

    if (srcset) {
      source.srcset = srcset;
    }

    if (sizes) {
      source.sizes = sizes;
    }
  });

  if (!image) {
    return Promise.resolve();
  }

  if (image.dataset.srcset) {
    image.srcset = image.dataset.srcset;
  }

  if (image.dataset.sizes) {
    image.sizes = image.dataset.sizes;
  }

  if (image.dataset.src) {
    image.src = image.dataset.src;
  }

  return new Promise<void>((resolve) => {
    if (image.complete && image.currentSrc) {
      resolve();
      return;
    }

    const complete = () => {
      image.removeEventListener('load', complete);
      image.removeEventListener('error', complete);
      resolve();
    };

    image.addEventListener('load', complete, { once: true });
    image.addEventListener('error', complete, { once: true });
  });
}

export async function requestPreviewPicture(picture: HTMLElement) {
  if (picture.dataset.previewState === 'loaded' || picture.dataset.previewState === 'loading') {
    return;
  }

  const previewPicture = picture.querySelector<HTMLElement>('.preview-picture');

  if (!previewPicture) {
    picture.dataset.previewState = 'loaded';
    return;
  }

  picture.dataset.previewState = 'loading';
  await applyDeferredSource(previewPicture);
  picture.dataset.previewState = 'loaded';
}

export async function requestFullPicture(picture: HTMLElement) {
  if (picture.dataset.imageState === 'loaded' || picture.dataset.imageState === 'loading') {
    return;
  }

  const fullPicture = picture.querySelector<HTMLElement>('.full-picture');

  if (!fullPicture) {
    picture.dataset.imageState = 'loaded';
    return;
  }

  picture.dataset.imageState = 'loading';
  await requestPreviewPicture(picture);

  window.setTimeout(() => {
    void applyDeferredSource(fullPicture).then(() => {
      picture.dataset.imageState = 'loaded';
    });
  }, 40);
}

export async function requestProgressivePicture(picture: HTMLElement) {
  await requestFullPicture(picture);
}

export function prewarmImage(url: string) {
  const image = new Image();
  image.decoding = 'async';
  image.src = url;
  return image;
}
