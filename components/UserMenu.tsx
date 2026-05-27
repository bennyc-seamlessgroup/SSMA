'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';

export function UserMenu({ ticker }: { ticker: string }) {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!isOpen) return;

    function closeOnOutsideClick(event: MouseEvent | TouchEvent) {
      if (!menuRef.current?.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') setIsOpen(false);
    }

    document.addEventListener('mousedown', closeOnOutsideClick);
    document.addEventListener('touchstart', closeOnOutsideClick);
    document.addEventListener('keydown', closeOnEscape);

    return () => {
      document.removeEventListener('mousedown', closeOnOutsideClick);
      document.removeEventListener('touchstart', closeOnOutsideClick);
      document.removeEventListener('keydown', closeOnEscape);
    };
  }, [isOpen]);

  return (
    <div className="user-menu" ref={menuRef}>
      <button className="user-menu__button" onClick={() => setIsOpen(open => !open)} aria-expanded={isOpen}>
        <span className="user-avatar">BC</span>
        <span className="user-menu__meta">
          <strong>Demo User</strong>
          <small>IR Admin</small>
        </span>
      </button>

      {isOpen && (
        <div className="user-menu__panel">
          <div className="user-menu__head">
            <strong>Currenc Intelligence</strong>
            <span>demo@currencintel.com</span>
          </div>
          <Link href={`/monitor/${ticker}/companies`} onClick={() => setIsOpen(false)}>Company Management</Link>
          <Link href={`/monitor/${ticker}/settings`} onClick={() => setIsOpen(false)}>Settings</Link>
          <Link href={`/monitor/${ticker}/billing`} onClick={() => setIsOpen(false)}>Billing & Plan</Link>
          <Link href={`/monitor/${ticker}/email-settings`} onClick={() => setIsOpen(false)}>Delivery Settings</Link>
          <Link href="/login" onClick={() => setIsOpen(false)}>Sign out</Link>
        </div>
      )}
    </div>
  );
}
