export interface SetOptions {
  coalesce?: boolean;
  coalesceKey?: string;
}

const COALESCE_WINDOW_MS = 500;

export class History<T> {
  private past: T[] = [];
  private present: T;
  private future: T[] = [];
  private lastSetAt = 0;
  private lastCoalesceKey: string | undefined;

  constructor(initial: T) {
    this.present = initial;
  }

  get(): T {
    return this.present;
  }

  set(next: T, opts: SetOptions = {}): void {
    const now = Date.now();
    const key = opts.coalesceKey;
    if (
      opts.coalesce &&
      key !== undefined &&
      this.lastCoalesceKey === key &&
      now - this.lastSetAt < COALESCE_WINDOW_MS
    ) {
      // Replace present in place — collapse rapid edits with the same key
      // (e.g. typing in a single prop field) into one history entry.
      this.present = next;
      this.lastSetAt = now;
      return;
    }
    this.past.push(this.present);
    this.present = next;
    this.future = [];
    this.lastSetAt = now;
    this.lastCoalesceKey = key;
  }

  undo(): T | null {
    if (this.past.length === 0) return null;
    this.future.unshift(this.present);
    const prev = this.past.pop();
    if (prev === undefined) return null;
    this.present = prev;
    this.lastCoalesceKey = undefined;
    return this.present;
  }

  redo(): T | null {
    if (this.future.length === 0) return null;
    this.past.push(this.present);
    const next = this.future.shift();
    if (next === undefined) return null;
    this.present = next;
    this.lastCoalesceKey = undefined;
    return this.present;
  }

  canUndo(): boolean {
    return this.past.length > 0;
  }

  canRedo(): boolean {
    return this.future.length > 0;
  }

  reset(next: T): void {
    this.past = [];
    this.future = [];
    this.present = next;
    this.lastSetAt = 0;
    this.lastCoalesceKey = undefined;
  }

  replacePresent(next: T): void {
    this.present = next;
  }
}
