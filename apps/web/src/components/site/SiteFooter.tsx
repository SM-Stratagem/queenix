import Link from 'next/link';
import { ArrowUpRight } from 'lucide-react';
import type { Sections } from './data';
import { Logo } from './Logo';
import { NAV } from './nav';

export function SiteFooter({ contact, social }: { contact: Sections['contact']; social: Sections['social'] }) {
  const socials = [
    ['Instagram', social.instagram],
    ['TikTok', social.tiktok],
    ['Facebook', social.facebook],
  ].filter(([, url]) => url);
  return (
    <footer className="site-footer">
      <div className="wrap footer-grid">
        <div className="footer-brand">
          <Logo tone="white" />
          <p>A private, women-only fitness club. {contact.address}</p>
        </div>
        <nav aria-label="Footer" className="footer-col">
          <h2>Explore</h2>
          {NAV.map((n) => (
            <Link key={n.href} href={n.href}>
              {n.label}
            </Link>
          ))}
        </nav>
        <div className="footer-col">
          <h2>Hours</h2>
          {contact.hours.map((h) => (
            <p key={h.days}>
              {h.days}
              <br />
              <span className="footer-dim">{h.time}</span>
            </p>
          ))}
        </div>
        <div className="footer-col">
          <h2>Follow</h2>
          {socials.map(([label, url]) => (
            <a key={label} href={url} target="_blank" rel="noopener noreferrer">
              {label} <ArrowUpRight size={14} aria-hidden />
            </a>
          ))}
        </div>
      </div>
      <div className="wrap footer-base">
        <span>© {new Date().getFullYear()} Queenix Gym</span>
        <Link href="/login">Staff login</Link>
      </div>
    </footer>
  );
}
