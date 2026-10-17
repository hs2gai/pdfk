import { PdfActionType, PdfZoomMode, type PdfDestinationObject, type PdfLinkTarget } from '@embedpdf/models';

/** Where a link annotation leads: a page (top = pt from the page's top edge, if the destination names one) or an external URI */
export type LinkJump = { kind: 'page'; pageIndex: number; top?: number } | { kind: 'uri'; uri: string };

/** Schemes opened in a new tab. Anything else (javascript:, file:, data: ...) is ignored */
const OPENABLE_SCHEMES = ['http:', 'https:', 'mailto:'];

export function isOpenableUri(uri: string): boolean {
  try {
    return OPENABLE_SCHEMES.includes(new URL(uri).protocol);
  } catch {
    // Relative or malformed: there is no base to resolve it against
    return false;
  }
}

function pageJump(dest: PdfDestinationObject, pageHeight: (pageIndex: number) => number | undefined): LinkJump | null {
  if (dest.pageIndex < 0) return null;
  const height = pageHeight(dest.pageIndex);
  if (height === undefined) return null;
  // /XYZ left top zoom: PDFium reports a missing (null) top as 0, i.e. the page bottom; treat it as "the page itself"
  if (dest.zoom.mode === PdfZoomMode.XYZ && dest.zoom.params.y > 0) {
    return { kind: 'page', pageIndex: dest.pageIndex, top: Math.max(0, height - dest.zoom.params.y) };
  }
  return { kind: 'page', pageIndex: dest.pageIndex };
}

/** Resolve a link annotation's target. null = nothing to do (no target, unsupported action, unsafe URI) */
export function resolveLinkTarget(
  target: PdfLinkTarget | undefined,
  pageHeight: (pageIndex: number) => number | undefined,
): LinkJump | null {
  if (!target) return null;
  if (target.type === 'destination') return pageJump(target.destination, pageHeight);
  const { action } = target;
  if (action.type === PdfActionType.Goto) return pageJump(action.destination, pageHeight);
  if (action.type === PdfActionType.URI) return isOpenableUri(action.uri) ? { kind: 'uri', uri: action.uri } : null;
  // RemoteGoto (another file) / Launch: not reachable from a browser tab
  return null;
}
