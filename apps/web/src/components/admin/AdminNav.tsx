'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { canOpen, useSessionRoles } from '@/lib/access';
import {
  LayoutDashboard,
  Users,
  CalendarDays,
  Dumbbell,
  ClipboardList,
  ClipboardCheck,
  CreditCard,
  Car,
  Coffee,
  Scissors,
  Building2,
  FileText,
  Tag,
  Bell,
  Send,
  BarChart3,
  ShieldCheck,
  Settings,
  Globe,
  Image,
  Newspaper,
} from 'lucide-react';

const SECTIONS: Array<{
  title: string;
  links: Array<{ href: string; label: string; icon: typeof Users }>;
}> = [
  {
    title: 'Overview',
    links: [{ href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard }],
  },
  {
    title: 'People',
    links: [
      { href: '/members', label: 'Members', icon: Users },
      { href: '/trainers', label: 'Trainers', icon: Dumbbell },
      { href: '/trainer', label: 'Trainer home', icon: Dumbbell },
      { href: '/team', label: 'Team & roles', icon: Users },
      { href: '/approvals', label: 'Approvals', icon: ClipboardCheck },
    ],
  },
  {
    title: 'Front desk',
    links: [
      { href: '/classes', label: 'Classes', icon: CalendarDays },
      { href: '/branches', label: 'Branches', icon: Building2 },
      { href: '/events', label: 'Events', icon: CalendarDays },
      { href: '/valet', label: 'Valet', icon: Car },
    ],
  },
  {
    title: 'Money',
    links: [{ href: '/finance', label: 'Finance', icon: CreditCard }],
  },
  {
    title: 'Venues',
    links: [
      { href: '/coffee', label: 'Coffee', icon: Coffee },
      { href: '/salon', label: 'Salon', icon: Scissors },
    ],
  },
  {
    title: 'Growth',
    links: [
      { href: '/crm', label: 'CRM', icon: ClipboardList },
      { href: '/promotions', label: 'Promotions', icon: Tag },
      { href: '/partners', label: 'Partners', icon: Building2 },
      { href: '/documents', label: 'Documents', icon: FileText },
    ],
  },
  {
    title: 'Outreach',
    links: [
      { href: '/notifications', label: 'Notifications', icon: Bell },
      { href: '/sales-push', label: 'Sales push', icon: Send },
    ],
  },
  {
    title: 'Website',
    links: [
      { href: '/website', label: 'Content', icon: Globe },
      { href: '/website/media', label: 'Media', icon: Image },
      { href: '/website/blog', label: 'Blog', icon: Newspaper },
    ],
  },
  {
    title: 'Control',
    links: [
      { href: '/reports', label: 'Reports', icon: BarChart3 },
      { href: '/audit', label: 'Audit log', icon: ShieldCheck },
      { href: '/settings', label: 'Settings', icon: Settings },
    ],
  },
];

/**
 * Finance allowlist: the finance role's nav shows ONLY Money, Venues and
 * Growth (Reports/Audit stay reachable from the Finance page). Every other
 * role sees the links lib/access lets it open.
 */
const FINANCE_SECTIONS = new Set(['Money', 'Venues', 'Growth']);

/** Admin primary nav. Every link targets a verified route in apps/web/src/app. */
export function AdminNav() {
  const pathname = usePathname();
  const roles = useSessionRoles();
  const elevated = roles.some((r) => r === 'superadmin' || r === 'admin');
  const financeOnly = !elevated && roles.length > 0 && roles.every((r) => r === 'finance' || r === 'member');
  const visible = SECTIONS.filter((s) => !financeOnly || FINANCE_SECTIONS.has(s.title))
    .map((s) => ({ ...s, links: s.links.filter((l) => canOpen(roles, l.href)) }))
    .filter((s) => s.links.length > 0);
  return (
    <nav aria-label="Admin" style={{ display: 'flex', flexDirection: 'column', gap: 16 }} className="admin-nav">
      {visible.map((s) => (
        <div key={s.title}>
          <div
            style={{
              padding: '4px 12px 6px',
              fontSize: 11,
              fontWeight: 800,
              color: 'rgba(255, 255, 255, 0.65)',
              textTransform: 'uppercase',
              letterSpacing: 1.2,
            }}
          >
            {s.title}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {s.links.map((l) => {
              const Icon = l.icon;
              // Longest matching link wins ('/website/media' must not light up '/website').
              const matches = (h: string) => pathname === h || pathname.startsWith(`${h}/`);
              const active =
                matches(l.href) && !s.links.some((o) => o.href.length > l.href.length && matches(o.href));
              return (
                <Link
                  key={l.href}
                  href={l.href}
                  aria-current={active ? 'page' : undefined}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                    padding: '10px 12px',
                    borderRadius: 10,
                    fontSize: 14,
                    fontWeight: active ? 700 : 500,
                    background: active ? '#ffffff' : 'transparent',
                    color: active ? '#00466f' : 'rgba(255, 255, 255, 0.92)',
                    boxShadow: active ? '0 2px 12px rgba(0, 0, 0, 0.25)' : 'none',
                  }}
                  onMouseEnter={(e) => {
                    if (!active) e.currentTarget.style.background = 'rgba(255, 255, 255, 0.14)';
                  }}
                  onMouseLeave={(e) => {
                    if (!active) e.currentTarget.style.background = 'transparent';
                  }}
                >
                  <Icon size={18} />
                  <span>{l.label}</span>
                </Link>
              );
            })}
          </div>
        </div>
      ))}
    </nav>
  );
}
