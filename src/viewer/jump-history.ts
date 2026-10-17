import { useSyncExternalStore } from 'react';

/** A place in the document: the page at the top of the view and how far down it (pt from the page's top edge) */
export interface ViewPosition {
  pageIndex: number;
  top: number;
}

const LIMIT = 50;

interface Stacks {
  back: ViewPosition[];
  forward: ViewPosition[];
}

/**
 * "Previous view / Next view" (as in Acrobat): where the view was before each jump (link, page number, thumbnail),
 * per document. Works like a browser's history. Exported as a factory for unit tests
 */
export function createJumpHistory() {
  const docs = new Map<string, Stacks>();
  const listeners = new Set<() => void>();
  const get = (id: string) => docs.get(id) ?? { back: [], forward: [] };
  const set = (id: string, s: Stacks) => {
    docs.set(id, { back: s.back.slice(-LIMIT), forward: s.forward.slice(-LIMIT) });
    listeners.forEach((l) => l());
  };
  /** Take the newest entry of one stack and leave `current` on the other */
  const step = (id: string, current: ViewPosition, dir: 'back' | 'forward') => {
    const { back, forward } = get(id);
    const [from, to] = dir === 'back' ? [back, forward] : [forward, back];
    const pos = from.at(-1);
    if (!pos) return undefined;
    const rest = from.slice(0, -1);
    const added = [...to, current];
    set(id, dir === 'back' ? { back: rest, forward: added } : { back: added, forward: rest });
    return pos;
  };
  return {
    /** A jump is about to leave `current`. A new jump drops the "next view" entries, as a browser does */
    record(id: string, current: ViewPosition) {
      set(id, { back: [...get(id).back, current], forward: [] });
    },
    back: (id: string, current: ViewPosition) => step(id, current, 'back'),
    forward: (id: string, current: ViewPosition) => step(id, current, 'forward'),
    stacks: (id: string) => docs.get(id) ?? EMPTY,
    subscribe(listener: () => void) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
}

const EMPTY: Stacks = { back: [], forward: [] };

export const jumpHistory = createJumpHistory();

/** The back / forward stacks of a document (re-renders when they change) */
export const useJumpStacks = (documentId: string) =>
  useSyncExternalStore(jumpHistory.subscribe, () => jumpHistory.stacks(documentId));
