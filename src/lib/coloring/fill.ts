// PASS 07 — bucket fill for the coloring studio (pure; unit-tested).
// Master Research spec System 2 §1: iterative scanline flood fill, 4-way connectivity,
// configurable RGB tolerance (product setting), line art kept on its own layer and used
// as a boundary mask so fills never cross a solid outline.
// MDN: ImageData (RGBA, 4 bytes per pixel), getImageData / putImageData.

export const FILL_TOLERANCE = 24; // RGB channel units (product setting, not an MDN value)
export const BOUNDARY_ALPHA = 128; // line-art pixels at or above this alpha block the fill

export type Rect = { x: number; y: number; w: number; h: number };
export type RGB = [number, number, number];

/** 1 where the line-art layer is opaque enough to be a wall, else 0. */
export function boundaryMask(lineArt: Uint8ClampedArray, w: number, h: number, alphaThreshold = BOUNDARY_ALPHA): Uint8Array {
  const mask = new Uint8Array(w * h);
  for (let i = 0; i < w * h; i++) mask[i] = lineArt[i * 4 + 3] >= alphaThreshold ? 1 : 0;
  return mask;
}

/**
 * Fill the region containing (sx, sy) on the paint layer with `color`.
 * A pixel joins the region if it is not a wall and its paint colour is within `tolerance`
 * of the seed colour. Afterwards the fill grows `bleed` pixels into adjacent wall pixels
 * (hidden under the line art) so anti-aliased edges leave no white gaps.
 * Returns the changed rectangle, or null if nothing changed.
 */
export function floodFill(
  paint: Uint8ClampedArray,
  mask: Uint8Array,
  w: number,
  h: number,
  sx: number,
  sy: number,
  color: RGB,
  tolerance = FILL_TOLERANCE,
  bleed = 2
): Rect | null {
  sx = Math.floor(sx);
  sy = Math.floor(sy);
  if (sx < 0 || sy < 0 || sx >= w || sy >= h) return null;
  const seedIdx = sy * w + sx;
  if (mask[seedIdx]) return null; // tapped on a line
  const so = seedIdx * 4;
  const seed: RGB = [paint[so], paint[so + 1], paint[so + 2]];
  if (Math.max(Math.abs(seed[0] - color[0]), Math.abs(seed[1] - color[1]), Math.abs(seed[2] - color[2])) === 0) return null;

  const visited = new Uint8Array(w * h);
  const matches = (i: number) => {
    if (mask[i] || visited[i]) return false;
    const o = i * 4;
    return (
      Math.max(Math.abs(paint[o] - seed[0]), Math.abs(paint[o + 1] - seed[1]), Math.abs(paint[o + 2] - seed[2])) <= tolerance
    );
  };

  let minX = sx, maxX = sx, minY = sy, maxY = sy;
  const filled: number[] = [];
  const stack: number[] = [sx, sy];
  while (stack.length) {
    const y = stack.pop() as number;
    let x = stack.pop() as number;
    let i = y * w + x;
    if (!matches(i)) continue;
    // walk left to the start of this span
    while (x > 0 && matches(i - 1)) {
      x--;
      i--;
    }
    let spanAbove = false;
    let spanBelow = false;
    while (x < w && matches(i)) {
      visited[i] = 1;
      filled.push(i);
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
      if (y > 0) {
        const up = matches(i - w);
        if (up && !spanAbove) stack.push(x, y - 1);
        spanAbove = up;
      }
      if (y < h - 1) {
        const down = matches(i + w);
        if (down && !spanBelow) stack.push(x, y + 1);
        spanBelow = down;
      }
      x++;
      i++;
    }
  }
  if (!filled.length) return null;

  const paintPixel = (i: number) => {
    const o = i * 4;
    paint[o] = color[0];
    paint[o + 1] = color[1];
    paint[o + 2] = color[2];
    paint[o + 3] = 255;
  };
  for (const i of filled) paintPixel(i);

  // Bleed under the line art: grow into wall pixels only (never into other open regions).
  let frontier = filled;
  for (let step = 0; step < bleed; step++) {
    const next: number[] = [];
    for (const i of frontier) {
      const x = i % w;
      const nbrs = [x > 0 ? i - 1 : -1, x < w - 1 ? i + 1 : -1, i >= w ? i - w : -1, i < w * (h - 1) ? i + w : -1];
      for (const n of nbrs) {
        if (n < 0 || visited[n] || !mask[n]) continue;
        visited[n] = 1;
        paintPixel(n);
        next.push(n);
        const nx = n % w, ny = (n - nx) / w;
        if (nx < minX) minX = nx;
        if (nx > maxX) maxX = nx;
        if (ny < minY) minY = ny;
        if (ny > maxY) maxY = ny;
      }
    }
    frontier = next;
  }
  return { x: minX, y: minY, w: maxX - minX + 1, h: maxY - minY + 1 };
}

export function hexToRgb(hex: string): RGB {
  const n = parseInt(hex.replace("#", ""), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
