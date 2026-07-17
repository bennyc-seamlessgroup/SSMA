'use client';

import { useEffect, useRef, useState } from 'react';
import { portalLanguageOptions, type PortalLanguage } from '@/lib/portal-i18n';
import { usePortalLanguage } from './usePortalLanguage';

export function PortalLanguageMenu({ buttonClassName = '' }: { buttonClassName?: string }) {
  const { language, setLanguage, t } = usePortalLanguage();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const currentLabel = portalLanguageOptions.find(([value]) => value === language)?.[1] ?? 'English';

  useEffect(() => {
    if (!open) return;
    const closeOnOutside = (event: MouseEvent | TouchEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', closeOnOutside);
    document.addEventListener('touchstart', closeOnOutside);
    document.addEventListener('keydown', closeOnEscape);
    return () => {
      document.removeEventListener('mousedown', closeOnOutside);
      document.removeEventListener('touchstart', closeOnOutside);
      document.removeEventListener('keydown', closeOnEscape);
    };
  }, [open]);

  function chooseLanguage(next: PortalLanguage) {
    setLanguage(next);
    setOpen(false);
  }

  return (
    <div className="portal-language-menu" ref={rootRef}>
      <button
        type="button"
        className={`${buttonClassName} portal-language-menu__button ${open ? 'is-active' : ''}`.trim()}
        aria-label={`${t('portalLanguage')}: ${currentLabel}`}
        aria-expanded={open}
        aria-haspopup="menu"
        title={`${t('portalLanguage')}: ${currentLabel}`}
        onClick={() => setOpen(current => !current)}
      >
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <circle cx="12" cy="12" r="9" />
          <path d="M3 12h18M12 3c2.4 2.5 3.6 5.5 3.6 9s-1.2 6.5-3.6 9c-2.4-2.5-3.6-5.5-3.6-9S9.6 5.5 12 3Z" />
        </svg>
      </button>

      {open && (
        <div className="portal-language-menu__panel" role="menu" aria-label={t('portalLanguage')}>
          {portalLanguageOptions.map(([value, label]) => (
            <button
              type="button"
              role="menuitemradio"
              aria-checked={language === value}
              className={language === value ? 'active' : ''}
              key={value}
              onClick={() => chooseLanguage(value)}
            >
              <span>{label}</span>
              {language === value && (
                <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m5 12 4 4L19 6" /></svg>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
