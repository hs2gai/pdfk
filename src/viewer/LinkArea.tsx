import { PdfAnnotationSubtype, type PdfAnnotationObject, type PdfLinkAnnoObject } from '@embedpdf/models';
import { useDocumentState } from '@embedpdf/core/react';
import { createRenderer, type AnnotationRendererProps } from '@embedpdf/plugin-annotation/react';
import { useT } from '../i18n';
import { resolveLinkTarget } from './link-target';
import { useViewNavigation } from './useViewNavigation';

/**
 * Clickable area of a link annotation (table of contents → chapter, cross references, URLs).
 * Links are locked (DEFAULT_LOCK), so they are never selected or moved; a click follows the link instead.
 */
function LinkArea({ annotation, documentId }: AnnotationRendererProps<PdfLinkAnnoObject>) {
  const doc = useDocumentState(documentId)?.document;
  const { jump: jumpTo } = useViewNavigation(documentId);
  const t = useT();
  const jump = resolveLinkTarget(annotation.object.target, (i) => doc?.pages[i]?.size.height);
  if (!jump) return null;

  const follow = () => {
    if (jump.kind === 'uri') {
      window.open(jump.uri, '_blank', 'noopener,noreferrer');
      return;
    }
    // The destination's top comes to the top of the view ("Previous view" returns here)
    jumpTo({ pageIndex: jump.pageIndex, top: jump.top ?? 0 });
  };

  return (
    <div
      className="link-area"
      title={jump.kind === 'uri' ? jump.uri : t('link.goToPage', { page: jump.pageIndex + 1 })}
      // Do not start a text selection / page interaction under the link
      onPointerDown={(e) => e.stopPropagation()}
      onClick={follow}
    />
  );
}

const isLink = (a: PdfAnnotationObject): a is PdfLinkAnnoObject => a.type === PdfAnnotationSubtype.LINK;

/** Passed to AnnotationLayer's annotationRenderers; replaces the default link renderer (select / move / window.open any URI) */
export const linkRenderer = createRenderer<PdfLinkAnnoObject>({
  id: 'link',
  matches: isLink,
  render: (props) => <LinkArea {...props} />,
  renderLocked: (props) => <LinkArea {...props} />,
});
