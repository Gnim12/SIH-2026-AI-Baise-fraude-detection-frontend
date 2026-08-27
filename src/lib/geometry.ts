export interface Size {
  width: number;
  height: number;
}

export interface Box {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface NormalisedRegion {
  x: number;
  y: number;
  w: number;
  h: number;
}

/** The `object-fit: contain` box of `natural` centered within `container`. */
export function fitContain(container: Size, natural: Size): Box {
  if (natural.width <= 0 || natural.height <= 0 || container.width <= 0 || container.height <= 0) {
    return { x: 0, y: 0, width: 0, height: 0 };
  }
  const containerRatio = container.width / container.height;
  const naturalRatio = natural.width / natural.height;

  if (naturalRatio > containerRatio) {
    // Image is relatively wider than the container: fills width, letterboxed top/bottom.
    const width = container.width;
    const height = width / naturalRatio;
    return { x: 0, y: (container.height - height) / 2, width, height };
  }

  // Image is relatively taller than (or equal to) the container: fills height, letterboxed left/right.
  const height = container.height;
  const width = height * naturalRatio;
  return { x: (container.width - width) / 2, y: 0, width, height };
}

/** Converts a normalised (0..1) region into a pixel box within `box`
 *  (typically the box returned by `fitContain`). Never bake pixel
 *  coordinates into fixtures — this is the only place region math happens. */
export function regionToPixels(region: NormalisedRegion, box: Box): Box {
  return {
    x: box.x + region.x * box.width,
    y: box.y + region.y * box.height,
    width: region.w * box.width,
    height: region.h * box.height,
  };
}
