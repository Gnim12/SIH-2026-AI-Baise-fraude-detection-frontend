import { describe, expect, it } from 'vitest';
import { fitContain, regionToPixels } from './geometry';

// A 1200x800 (1.5:1) document image, matching the aspect ratio of the
// case-03 fixture asset in shape (not pixel-identical, just representative).
const IMAGE = { width: 1200, height: 800 };
const REGION = { x: 0.5, y: 0.5, w: 0.1, h: 0.1 };

describe('geometry: fitContain + regionToPixels survive a resize', () => {
  it('lands the region correctly in a wider-than-image container (letterboxed top/bottom)', () => {
    // container 1.5:1 image (naturalRatio) < 2:1 container -> fills height variant is
    // wrong; work it out: naturalRatio 1.5, containerRatio 1000/500=2 -> naturalRatio < containerRatio
    // -> image fills height, letterboxed left/right.
    const container = { width: 1000, height: 500 };
    const box = fitContain(container, IMAGE);

    // naturalRatio (1.5) < containerRatio (2): height fills container, width computed.
    expect(box.height).toBeCloseTo(500);
    expect(box.width).toBeCloseTo(500 * 1.5); // 750
    expect(box.y).toBeCloseTo(0);
    expect(box.x).toBeCloseTo((1000 - 750) / 2); // 125

    const pixel = regionToPixels(REGION, box);
    expect(pixel.x).toBeCloseTo(box.x + 0.5 * box.width); // 125 + 375 = 500
    expect(pixel.y).toBeCloseTo(box.y + 0.5 * box.height); // 0 + 250 = 250
    expect(pixel.width).toBeCloseTo(0.1 * box.width); // 75
    expect(pixel.height).toBeCloseTo(0.1 * box.height); // 50
  });

  it('lands the region correctly in a taller-than-image container (letterboxed left/right becomes top/bottom)', () => {
    // container 900x900 -> containerRatio 1, naturalRatio 1.5 > containerRatio ->
    // image fills width, letterboxed top/bottom.
    const container = { width: 900, height: 900 };
    const box = fitContain(container, IMAGE);

    expect(box.width).toBeCloseTo(900);
    expect(box.height).toBeCloseTo(900 / 1.5); // 600
    expect(box.x).toBeCloseTo(0);
    expect(box.y).toBeCloseTo((900 - 600) / 2); // 150

    const pixel = regionToPixels(REGION, box);
    expect(pixel.x).toBeCloseTo(box.x + 0.5 * box.width); // 450
    expect(pixel.y).toBeCloseTo(box.y + 0.5 * box.height); // 150 + 300 = 450
    expect(pixel.width).toBeCloseTo(0.1 * box.width); // 90
    expect(pixel.height).toBeCloseTo(0.1 * box.height); // 60
  });

  it('has no letterboxing when the container matches the image aspect exactly', () => {
    const container = { width: 600, height: 400 };
    const box = fitContain(container, IMAGE);
    expect(box).toEqual({ x: 0, y: 0, width: 600, height: 400 });

    const pixel = regionToPixels(REGION, box);
    expect(pixel).toEqual({ x: 300, y: 200, width: 60, height: 40 });
  });
});
