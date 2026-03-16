type RequestPriority = 'high' | 'low' | 'auto';
type FullRequestSource = 'grid' | 'lightbox-active' | 'lightbox-background';

interface ApplyDeferredSourceOptions {
  priority?: RequestPriority;
}

interface PreviewRequestOptions {
  priority?: RequestPriority;
}

interface FullRequestOptions {
  previewPriority?: RequestPriority;
  priority?: RequestPriority;
  source?: FullRequestSource;
}

interface ProgressiveRequestOptions extends FullRequestOptions {}

interface FullRequestTask {
  id: number;
  picture: HTMLElement;
  fullPicture: HTMLElement;
  source: FullRequestSource;
  priority: RequestPriority;
  order: number;
  status: 'queued' | 'loading';
  resolve: () => void;
  promise: Promise<void>;
}

const MAX_CONCURRENT_FULL_REQUESTS = 2;

const previewRequests = new WeakMap<HTMLElement, Promise<void>>();
const fullRequests = new WeakMap<HTMLElement, FullRequestTask>();
const activeRequests = new Set<FullRequestTask>();
const queuedRequests: FullRequestTask[] = [];

let nextTaskId = 0;
let nextQueueOrder = 0;

function getPriorityWeight(priority: RequestPriority) {
  switch (priority) {
    case 'high':
      return 2;
    case 'low':
      return 0;
    default:
      return 1;
  }
}

function sortQueuedRequests() {
  queuedRequests.sort((left, right) => {
    const priorityDelta = getPriorityWeight(right.priority) - getPriorityWeight(left.priority);

    if (priorityDelta !== 0) {
      return priorityDelta;
    }

    return left.order - right.order;
  });
}

function applyImagePriority(image: HTMLImageElement | null, priority: RequestPriority) {
  if (!image) {
    return;
  }

  image.setAttribute('fetchpriority', priority);
}

function setPicturePriority(picture: HTMLElement, priority: RequestPriority) {
  const image = picture.querySelector<HTMLImageElement>('img');
  applyImagePriority(image, priority);
}

function applyDeferredSource(picture: HTMLElement, { priority = 'auto' }: ApplyDeferredSourceOptions = {}) {
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

  applyImagePriority(image, priority);

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

function pumpFullRequestQueue() {
  sortQueuedRequests();

  while (activeRequests.size < MAX_CONCURRENT_FULL_REQUESTS && queuedRequests.length > 0) {
    const task = queuedRequests.shift();

    if (!task) {
      return;
    }

    task.status = 'loading';
    activeRequests.add(task);
    task.picture.dataset.imageState = 'loading';
    setPicturePriority(task.fullPicture, task.priority);

    void applyDeferredSource(task.fullPicture, { priority: task.priority }).then(() => {
      activeRequests.delete(task);
      fullRequests.delete(task.picture);

      task.picture.dataset.imageState = 'loaded';
      task.resolve();
      pumpFullRequestQueue();
    });
  }
}

function queueFullPictureRequest(
  picture: HTMLElement,
  fullPicture: HTMLElement,
  { priority = 'auto', source = 'grid' }: Pick<FullRequestOptions, 'priority' | 'source'>
) {
  const existingTask = fullRequests.get(picture);

  if (existingTask) {
    if (getPriorityWeight(priority) > getPriorityWeight(existingTask.priority)) {
      existingTask.priority = priority;
    }

    existingTask.source = source;

    if (existingTask.status === 'loading') {
      setPicturePriority(existingTask.fullPicture, existingTask.priority);
    } else {
      sortQueuedRequests();
      pumpFullRequestQueue();
    }

    return existingTask.promise;
  }

  let resolve = () => {};
  const promise = new Promise<void>((nextResolve) => {
    resolve = nextResolve;
  });

  const task: FullRequestTask = {
    id: nextTaskId,
    picture,
    fullPicture,
    source,
    priority,
    order: nextQueueOrder,
    status: 'queued',
    resolve,
    promise,
  };

  nextTaskId += 1;
  nextQueueOrder += 1;

  fullRequests.set(picture, task);
  picture.dataset.imageState = 'queued';
  queuedRequests.push(task);
  pumpFullRequestQueue();

  return promise;
}

export async function requestPreviewPicture(
  picture: HTMLElement,
  { priority = 'auto' }: PreviewRequestOptions = {}
) {
  if (picture.dataset.previewState === 'loaded') {
    const previewPicture = picture.querySelector<HTMLElement>('.preview-picture');

    if (previewPicture) {
      setPicturePriority(previewPicture, priority);
    }

    return;
  }

  const previewPicture = picture.querySelector<HTMLElement>('.preview-picture');

  if (!previewPicture) {
    picture.dataset.previewState = 'loaded';
    return;
  }

  setPicturePriority(previewPicture, priority);

  const existingRequest = previewRequests.get(picture);

  if (existingRequest) {
    return existingRequest;
  }

  picture.dataset.previewState = 'loading';

  const request = applyDeferredSource(previewPicture, { priority }).then(() => {
    picture.dataset.previewState = 'loaded';
    previewRequests.delete(picture);
  });

  previewRequests.set(picture, request);
  return request;
}

export async function requestFullPicture(
  picture: HTMLElement,
  { previewPriority = 'auto', priority = 'auto', source = 'grid' }: FullRequestOptions = {}
) {
  if (picture.dataset.imageState === 'loaded') {
    return;
  }

  const fullPicture = picture.querySelector<HTMLElement>('.full-picture');

  if (!fullPicture) {
    picture.dataset.imageState = 'loaded';
    return;
  }

  await requestPreviewPicture(picture, { priority: previewPriority });
  return queueFullPictureRequest(picture, fullPicture, { priority, source });
}

export async function requestProgressivePicture(
  picture: HTMLElement,
  { previewPriority = 'high', priority = 'low', source = 'grid' }: ProgressiveRequestOptions = {}
) {
  await requestFullPicture(picture, {
    previewPriority,
    priority,
    source,
  });
}

export function cancelQueuedFullPictureRequests(source: FullRequestSource) {
  for (let index = queuedRequests.length - 1; index >= 0; index -= 1) {
    const task = queuedRequests[index];

    if (task.source !== source) {
      continue;
    }

    queuedRequests.splice(index, 1);
    fullRequests.delete(task.picture);
    task.picture.dataset.imageState = 'preview';
    task.resolve();
  }
}

export function deprioritizeFullPictureRequests(source: FullRequestSource) {
  queuedRequests.forEach((task) => {
    if (task.source !== source) {
      return;
    }

    task.priority = 'low';
  });

  activeRequests.forEach((task) => {
    if (task.source !== source) {
      return;
    }

    task.priority = 'low';
    setPicturePriority(task.fullPicture, 'low');
  });

  sortQueuedRequests();
}

export function prewarmImage(url: string, priority: RequestPriority = 'low') {
  const image = new Image();
  image.decoding = 'async';
  image.setAttribute('fetchpriority', priority);
  image.src = url;
  return image;
}
