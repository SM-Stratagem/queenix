'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
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
} from 'lucide-react';

const SECTIONS: Array<{
  title: string;
  links: Array<{ href: string; label: string; icon: typeof Users }>;
}> = [
  {
    title: 'Overview',
    links: [{ href: '/', label: 'Dashboard', icon: LayoutDashboard }],
  },
  {
    title: 'People',
    links: [
      { href: '/members', label: 'Members', icon: Users },
      { href: '/trainers', label: 'Trainers', icon: Dumbbell },
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
    title: 'Control',
    links: [
      { href: '/reports', label: 'Reports', icon: BarChart3 },
      { href: '/audit', label: 'Audit log', icon: ShieldCheck },
    ],
  },
];

/** Admin primary nav. Every link targets a verified route in apps/web/src/app. */
export function AdminNav() {
  const pathname = usePathname();
  return (
    <nav aria-label="Admin" style={{ display: 'flex', flexDirection: 'column', gap: 16 }} className="admin-nav">
      {SECTIONS.map((s) => (
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
              const active =
                l.href === '/' ? pathname === '/' : pathname === l.href || pathname.startsWith(`${l.href}/`);
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
