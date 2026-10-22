import type { MetadataRoute } from 'next';
import { SITE_URL, q, site } from '@/components/site/data';

export const dynamic = 'force-dynamic';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const pages = ['', '/schedule', '/gallery', '/blog', '/contact'].map((p) => ({
    url: `${SITE_URL}${p}`,
    changeFrequency: (p === '/schedule' ? 'daily' : 'weekly') as 'daily' | 'weekly',
    priority: p === '' ? 1 : 0.7,
  }));
  const posts = await q(site.listPosts, { limit: 100 }).catch(() => []);
  return [
    ...pages,
    ...posts.map((p) => ({ url: `${SITE_URL}/blog/${p.slug}`, lastModified: new Date(p.publishedAt), priority: 0.6 })),
  ];
}
