'use client';

import { useEffect, useRef, useState } from 'react';
import { readableAlertMetric, useAlertNotifications } from './AlertNotificationProvider';
import { usePortalTimeZone } from './usePortalTimeZone';
import { formatPortalDateTime } from '@/lib/timezone';

export function NotificationInbox() {
  const [isOpen, setIsOpen] = useState(false);
  const inboxRef = useRef<HTMLDivElement | null>(null);
  const timeZone = usePortalTimeZone();
  const { alerts, unreadCount, markAllRead } = useAlertNotifications();

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
        onClick={() => {
          setIsOpen(open => {
            const next = !open;
            if (next) markAllRead();
            return next;
          });
        }}
      >
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M18 16v-5a6 6 0 0 0-12 0v5l-2 2h16l-2-2Z" />
          <path d="M10 21h4" />
        </svg>
        {unreadCount > 0 ? <span className="portal-notification-unread">{Math.min(unreadCount, 99)}</span> : null}
      </button>

      {isOpen && (
        <section className="portal-notification-panel" role="dialog" aria-label="Notification inbox">
          <header>
            <strong>Inbox</strong>
            {alerts.length ? <span>{alerts.length} today</span> : null}
          </header>
          {alerts.length ? (
            <div className="portal-notification-alerts">
              {alerts.map(alert => (
                <article className={alert.severity} key={alert.id}>
                  <span className="portal-notification-alerts__marker" aria-hidden="true" />
                  <div>
                    <strong>{readableAlertMetric(alert.formula)}</strong>
                    <p>{alert.formula} · Triggered value {alert.triggeredValue || 'N/A'}</p>
                    <small>{alert.ticker} · {formatPortalDateTime(alert.createDatetime, timeZone)}</small>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className="portal-notification-empty">
              <span aria-hidden="true">
                <svg viewBox="0 0 24 24">
                  <path d="M18 16v-5a6 6 0 0 0-12 0v5l-2 2h16l-2-2Z" />
                  <path d="M10 21h4" />
                </svg>
              </span>
              <strong>No alerts today</strong>
              <p>You&apos;re all caught up. Triggered alerts will appear here.</p>
            </div>
          )}
        </section>
      )}
    </div>
  );
}
