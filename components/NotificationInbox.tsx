'use client';

import { useEffect, useRef, useState } from 'react';

export function NotificationInbox() {
  const [isOpen, setIsOpen] = useState(false);
  const inboxRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!isOpen) return;

    function closeOnOutside(event: MouseEvent | TouchEvent) {
      if (!inboxRef.current?.contains(event.target as Node)) setIsOpen(false);
    }

    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') setIsOpen(false);
    }

    document.addEventListener('mousedown', closeOnOutside);
    document.addEventListener('touchstart', closeOnOutside);
    document.addEventListener('keydown', closeOnEscape);
    return () => {
      document.removeEventListener('mousedown', closeOnOutside);
      document.removeEventListener('touchstart', closeOnOutside);
      document.removeEventListener('keydown', closeOnEscape);
    };
  }, [isOpen]);

  return (
    <div className="portal-notification-inbox" ref={inboxRef}>
      <button
        type="button"
        className={isOpen ? 'is-active' : ''}
        aria-label="Notifications"
        aria-expanded={isOpen}
        aria-haspopup="dialog"
        onClick={() => setIsOpen(open => !open)}
      >
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M18 16v-5a6 6 0 0 0-12 0v5l-2 2h16l-2-2Z" />
          <path d="M10 21h4" />
        </svg>
      </button>

      {isOpen && (
        <section className="portal-notification-panel" role="dialog" aria-label="Notification inbox">
          <header>
            <strong>Inbox</strong>
          </header>
          <div className="portal-notification-empty">
            <span aria-hidden="true">
              <svg viewBox="0 0 24 24">
                <path d="M18 16v-5a6 6 0 0 0-12 0v5l-2 2h16l-2-2Z" />
                <path d="M10 21h4" />
              </svg>
            </span>
            <strong>No messages</strong>
            <p>You&apos;re all caught up. New portal messages will appear here.</p>
          </div>
        </section>
      )}
    </div>
  );
}
