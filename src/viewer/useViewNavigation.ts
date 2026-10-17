import { useScrollCapability } from '@embedpdf/plugin-scroll/react';
import { useViewportCapability } from '@embedpdf/plugin-viewport/react';
import { useAppSettings } from '../app/settings';
import { jumpHistory, type ViewPosition } from './jump-history';

/**
 * Page jumps that "Previous view / Next view" can retrace (links, page number box, thumbnails).
 * Plain scrolling is not recorded, as in Acrobat's default.
 * Does not subscribe to the scroll state: every link area on the page uses this, and they need not re-render on scroll
 */
export function useViewNavigation(documentId: string) {
  const { provides: scrollCap } = useScrollCapability();
  const { provides: viewport } = useViewportCapability();
  const { smoothScroll } = useAppSettings();
  const scroll = scrollCap?.forDocument(documentId);

  /** The page at the top of the view and how far down it is scrolled */
  const current = (): ViewPosition | null => {
    const visible = scroll?.getMetrics().pageVisibilityMetrics;
    if (!visible?.length) return null;
    const top = visible.reduce((a, b) => (b.pageNumber < a.pageNumber ? b : a));
    // The metrics measure from the view's top edge, while scrollToPage leaves the viewport gap above the target
    const gap = (viewport?.getViewportGap() ?? 0) / top.scaled.scale;
    return { pageIndex: top.pageNumber - 1, top: Math.max(0, top.original.pageY - gap) };
  };

  const scrollTo = (pos: ViewPosition) =>
    scroll?.scrollToPage({
      // Pages may have been deleted since the position was recorded
      pageNumber: Math.min(pos.pageIndex + 1, scroll.getTotalPages()),
      pageCoordinates: { x: 0, y: pos.top },
      behavior: smoothScroll ? 'smooth' : 'instant',
    });

  const step = (dir: 'back' | 'forward') => {
    const cur = current();
    const pos = cur && jumpHistory[dir](documentId, cur);
    if (pos) scrollTo(pos);
  };

  return {
    /** Go to `pos`, remembering where the view was */
    jump(pos: ViewPosition) {
      const cur = current();
      if (cur) jumpHistory.record(documentId, cur);
      scrollTo(pos);
    },
    goBack: () => step('back'),
    goForward: () => step('forward'),
  };
}
