'use client';

import Link from 'next/link';
import { useState } from 'react';

export function UserMenu({ ticker }: { ticker: string }) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="user-menu">
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
          <Link href={`/monitor/${ticker}/companies`}>Company Management</Link>
          <Link href={`/monitor/${ticker}/settings`}>Settings</Link>
          <Link href={`/monitor/${ticker}/billing`}>Billing & Plan</Link>
          <Link href={`/monitor/${ticker}/email-settings`}>Delivery Settings</Link>
          <Link href="/login">Sign out</Link>
        </div>
      )}
    </div>
  );
}
