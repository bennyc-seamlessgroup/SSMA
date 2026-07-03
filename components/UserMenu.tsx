'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { getAuthenticatedProfile, getCurrentUser, signOut } from '@/lib/auth-client';
import { endPublicDemoSession, isPublicDemoSession } from '@/lib/public-demo';

export function UserMenu({ ticker }: { ticker: string }) {
  const [isOpen, setIsOpen] = useState(false);
  const [email, setEmail] = useState(() => {
    const tokenEmail = getCurrentUser()?.email;
    return typeof tokenEmail === 'string' ? tokenEmail.trim() : '';
  });
  const [isDemo, setIsDemo] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    let cancelled = false;
    setIsDemo(isPublicDemoSession());
    getAuthenticatedProfile()
      .then(profile => {
        if (!cancelled && typeof profile.email === 'string' && profile.email.trim()) {
          setEmail(profile.email.trim());
        }
      })
      .catch(() => {
        const tokenEmail = getCurrentUser()?.email;
        if (!cancelled && typeof tokenEmail === 'string') setEmail(tokenEmail.trim());
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const avatarLetter = email ? email.charAt(0).toUpperCase() : 'U';
  const displayName = email.includes('@') ? email.split('@')[0] : 'User';

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
        <span className="user-avatar" aria-hidden="true">{avatarLetter}</span>
        <span className="user-menu__meta">
          <strong>{displayName}</strong>
          <small>{isDemo ? 'Demo Viewer' : 'IR Admin'}</small>
        </span>
      </button>

      {isOpen && (
        <div className="user-menu__panel">
          <div className="user-menu__head">
            <strong>Currenc Intelligence</strong>
            <span>{email || 'Signed in'}</span>
          </div>
          <Link href={`/monitor/${ticker}/user-profile`} onClick={() => setIsOpen(false)}>User Profile</Link>
          <Link href={`/monitor/${ticker}/companies`} onClick={() => setIsOpen(false)}>Company Management</Link>
          <Link href={`/monitor/${ticker}/settings`} onClick={() => setIsOpen(false)}>Settings</Link>
          <Link href={`/monitor/${ticker}/email-settings`} onClick={() => setIsOpen(false)}>Delivery Settings</Link>
          <button className="user-menu__link-button" type="button" onClick={() => {
            setIsOpen(false);
            if (isDemo) {
              endPublicDemoSession();
              window.location.assign('/');
            } else {
              signOut();
            }
          }}>{isDemo ? 'Exit demo' : 'Sign out'}</button>
        </div>
      )}
    </div>
  );
}
