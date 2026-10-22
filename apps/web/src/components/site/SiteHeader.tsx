'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useRef } from 'react';
import { Menu, X } from 'lucide-react';
import { Logo } from './Logo';
import { NAV } from './nav';


const isActive = (path: string, href: string) => (href === '/' ? path === '/' : path === href || path.startsWith(`${href}/`));

export function SiteHeader() {
  const path = usePathname() || '/';
  const menu = useRef<HTMLDetailsElement>(null);
  useEffect(() => {
    if (menu.current) menu.current.open = false;
  }, [path]);

  const links = NAV.map((n) => (
    <Link key={n.href} href={n.href} aria-current={isActive(path, n.href) ? 'page' : undefined}>
      {n.label}
    </Link>
  ));

  return (
    <header className="site-header">
      <div className="wrap site-header-row">
        <Link href="/" className="site-home" aria-label="Queenix Gym home">
          <Logo />
        </Link>
        <nav className="site-nav" aria-label="Main">
          {links}
        </nav>
        <div className="site-header-actions">
          <Link href="/login" className="staff-link">
            Staff login
          </Link>
          <Link href="/contact#trial" className="btn btn--solid btn--sm">
            Book a free trial
          </Link>
        </div>
        <details className="site-menu" ref={menu}>
          <summary aria-label="Menu">
            <Menu className="i-open" size={22} aria-hidden />
            <X className="i-close" size={22} aria-hidden />
          </summary>
          <div className="site-menu-panel">
            <nav aria-label="Mobile">{links}</nav>
            <Link href="/contact#trial" className="btn btn--solid btn--lg">
              Book a free trial
            </Link>
            <Link href="/login" className="staff-link">
              Staff login
            </Link>
          </div>
        </details>
      </div>
    </header>
  );
}
