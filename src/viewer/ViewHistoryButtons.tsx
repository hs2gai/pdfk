import { useEffect } from 'react';
import { IconButton } from '../annotations/IconButton';
import { isTyping } from '../app/useKeyboardShortcuts';
import { useT } from '../i18n';
import { useJumpStacks } from './jump-history';
import { useViewNavigation } from './useViewNavigation';

/** "Previous view / Next view" (as in Acrobat): retrace jumps made by links, the page number box and thumbnails */
export function ViewHistoryButtons({ documentId }: { documentId: string }) {
  const t = useT();
  const { goBack, goForward } = useViewNavigation(documentId);
  const { back, forward } = useJumpStacks(documentId);

  // Alt+← / Alt+→ (Acrobat's keys; the browser's own Back would leave the app)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!e.altKey || e.ctrlKey || e.metaKey || e.shiftKey || isTyping(e.target)) return;
      if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
      e.preventDefault();
      if (e.key === 'ArrowLeft') goBack();
      else goForward();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [goBack, goForward]);

  return (
    <>
      <IconButton
        icon="viewBack"
        label={t('toolbar.viewBack')}
        title={t('toolbar.viewBack.help')}
        disabled={back.length === 0}
        onClick={goBack}
      />
      <IconButton
        icon="viewForward"
        label={t('toolbar.viewForward')}
        title={t('toolbar.viewForward.help')}
        disabled={forward.length === 0}
        onClick={goForward}
      />
    </>
  );
}
