// PASS 07 — undo/redo for the coloring studio (pure; unit-tested).
// Master Research spec System 2 §2: one transaction per complete gesture; store only the
// changed region (before/after pixels); cap at 30 operations and a 32 MiB budget, evicting
// the oldest; a new action after Undo clears the redo branch. (Limits are product settings.)

export const MAX_OPS = 30;
export const MAX_BYTES = 32 * 1024 * 1024;

export type Patch = { x: number; y: number; w: number; h: number; before: Uint8ClampedArray; after: Uint8ClampedArray };

export class History {
  private undoStack: Patch[] = [];
  private redoStack: Patch[] = [];
  private bytes = 0;

  private maxOps: number;
  private maxBytes: number;

  constructor(maxOps = MAX_OPS, maxBytes = MAX_BYTES) {
    this.maxOps = maxOps;
    this.maxBytes = maxBytes;
  }

  private static size(p: Patch) {
    return p.before.byteLength + p.after.byteLength;
  }

  push(p: Patch) {
    for (const r of this.redoStack) this.bytes -= History.size(r);
    this.redoStack = [];
    this.undoStack.push(p);
    this.bytes += History.size(p);
    while (this.undoStack.length > this.maxOps || (this.bytes > this.maxBytes && this.undoStack.length > 1)) {
      const old = this.undoStack.shift()!;
      this.bytes -= History.size(old);
    }
  }

  /** Returns the patch whose `before` pixels should be written back, or null. */
  undo(): Patch | null {
    const p = this.undoStack.pop();
    if (!p) return null;
    this.redoStack.push(p);
    return p;
  }

  /** Returns the patch whose `after` pixels should be written back, or null. */
  redo(): Patch | null {
    const p = this.redoStack.pop();
    if (!p) return null;
    this.undoStack.push(p);
    return p;
  }

  clear() {
    this.undoStack = [];
    this.redoStack = [];
    this.bytes = 0;
  }

  get canUndo() {
    return this.undoStack.length > 0;
  }
  get canRedo() {
    return this.redoStack.length > 0;
  }
  get usedBytes() {
    return this.bytes;
  }
  get depth() {
    return this.undoStack.length;
  }
}
