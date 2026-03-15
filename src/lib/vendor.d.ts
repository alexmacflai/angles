declare module 'imagesloaded' {
  interface ImagesLoadedInstance {
    on(eventName: string, callback: () => void): void;
  }

  export default function imagesLoaded(
    element: Element | string,
    callback?: () => void
  ): ImagesLoadedInstance;
}

declare module 'masonry-layout' {
  interface MasonryOptions {
    columnWidth?: string | number | Element;
    itemSelector?: string;
    gutter?: number;
    percentPosition?: boolean;
    transitionDuration?: string;
    stagger?: number;
  }

  export default class Masonry {
    constructor(element: Element, options?: MasonryOptions);
    layout(): void;
    destroy(): void;
  }
}
