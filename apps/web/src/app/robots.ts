import type { MetadataRoute } from 'next';
import { SITE_URL } from '@/components/site/data';

/** Public site is crawlable; the staff console and APIs are not. */
const CONSOLE = [
  '/api/', '/login', '/dashboard', '/members', '/trainers', '/trainer', '/team', '/approvals', '/classes',
  '/branches', '/events', '/valet', '/finance', '/owner', '/coffee', '/salon', '/crm', '/promotions', '/partners',
  '/documents', '/notifications', '/sales-push', '/reports', '/audit', '/settings', '/website',
];

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: '*', allow: '/', disallow: CONSOLE }],
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
