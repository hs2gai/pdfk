import { useLayoutEffect, useRef, useState } from 'react';
import { IconButton } from '../annotations/IconButton';
import { appSettings, useAppSettings, type Locale } from './settings';
import { loadLocalFontCatalog, supportsLocalFonts } from '../pdf/fonts/local-fonts';
import { useDismiss } from '../shared/useDismiss';
import { LOCALES, useT } from '../i18n';

/** Public repository (source code, releases) */
const REPOSITORY_URL = 'https://github.com/hs2gai/pdfk';

/** Settings menu at the right end of the toolbar */
export function SettingsMenu() {
  const [open, setOpen] = useState(false);
  const [fontError, setFontError] = useState<string | null>(null);
  const s = useAppSettings();
  const t = useT();
  const list = useRef<HTMLDivElement>(null);
  const root = useRef<HTMLDivElement>(null);
  useDismiss(root, open, () => setOpen(false));

  // When the toolbar wraps and the button sits on the left, right-anchoring would overflow the screen, so anchor to the left instead
  useLayoutEffect(() => {
    const el = list.current;
    if (!open || !el) return;
    el.style.right = '';
    el.style.left = '';
    if (el.getBoundingClientRect().left < 0) {
      el.style.right = 'auto';
      el.style.left = '0';
    }
  }, [open]);

  // Fetch the list inside the click handler (the first permission dialog needs a user gesture)
  const toggleLocalFonts = async (on: boolean) => {
    setFontError(null);
    if (!on) return appSettings.set({ localFonts: false });
    try {
      await loadLocalFontCatalog();
      appSettings.set({ localFonts: true });
    } catch (e) {
      setFontError(e instanceof Error && e.name === 'NotAllowedError' ? t('settings.localFonts.denied') : String(e));
    }
  };
  return (
    <div ref={root} className="menu">
      <IconButton icon="settings" label={t('settings.title')} title={t('settings.help')} active={open} onClick={() => setOpen((v) => !v)} />
      {open && (
        <div ref={list} className="menu-list settings-list" onMouseLeave={() => setOpen(false)}>
          <label className="settings-row settings-select">
            <span className="menu-label">{t('settings.language')}</span>
            <select value={s.locale} onChange={(e) => appSettings.set({ locale: e.target.value as Locale })}>
              {LOCALES.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.label}
                </option>
              ))}
            </select>
          </label>
          <CheckRow
            label={t('settings.autoResume')}
            help={t('settings.autoResume.help')}
            checked={s.autoResume}
            onChange={(on) => appSettings.set({ autoResume: on })}
          />
          <CheckRow
            label={t('settings.smoothScroll')}
            help={t('settings.smoothScroll.help')}
            checked={s.smoothScroll}
            onChange={(on) => appSettings.set({ smoothScroll: on })}
          />
          <CheckRow
            label={t('settings.highlightFields')}
            help={t('settings.highlightFields.help')}
            checked={s.highlightFields}
            onChange={(on) => appSettings.set({ highlightFields: on })}
          />
          {supportsLocalFonts() && (
            <CheckRow
              label={t('settings.localFonts')}
              help={t('settings.localFonts.help')}
              error={fontError}
              checked={s.localFonts}
              onChange={(on) => void toggleLocalFonts(on)}
            />
          )}
          <div className="menu-help settings-version">
            {/* Opened only when clicked: nothing is fetched from there by the app (P1) */}
            <a href={REPOSITORY_URL} target="_blank" rel="noopener noreferrer" title={t('settings.repository')}>
              pdfk {__APP_VERSION__}
            </a>
          </div>
        </div>
      )}
    </div>
  );
}

/** Checkbox row showing only the title; the description appears as a tooltip on hover */
function CheckRow({
  label,
  help,
  error,
  checked,
  onChange,
}: {
  label: string;
  help: string;
  error?: string | null;
  checked: boolean;
  onChange: (on: boolean) => void;
}) {
  return (
    <label className="settings-row" title={help}>
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      <span>
        <span className="menu-label">{label}</span>
        {error && <span className="menu-help">{error}</span>}
      </span>
    </label>
  );
}
