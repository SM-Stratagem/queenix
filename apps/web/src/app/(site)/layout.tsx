import type { Metadata } from 'next';
import { Figtree, Saira } from 'next/font/google';
import { SiteHeader } from '@/components/site/SiteHeader';
import { SiteFooter } from '@/components/site/SiteFooter';
import { SITE_URL, getSections } from '@/components/site/data';
import '@/components/site/site.css';

// Live data (timetable, plans) on every request; no build-time Convex fetch.
export const dynamic = 'force-dynamic';

const display = Saira({ subsets: ['latin'], axes: ['wdth'], variable: '--font-display', display: 'swap' });
const body = Figtree({ subsets: ['latin'], variable: '--font-body', display: 'swap' });

export async function generateMetadata(): Promise<Metadata> {
  const s = await getSections();
  return {
    metadataBase: new URL(SITE_URL),
    title: { default: s.seo.title, template: '%s · Queenix Gym' },
    description: s.seo.description,
    openGraph: {
      type: 'website',
      siteName: 'Queenix Gym',
      title: s.seo.title,
      description: s.seo.description,
      images: s.heroImage ? [{ url: s.heroImage.url, alt: s.heroImage.alt }] : ['/queenix-logo.jpg'],
    },
    twitter: { card: 'summary_large_image' },
  };
}

export default async function SiteLayout({ children }: { children: React.ReactNode }) {
  const s = await getSections();
  return (
    <div className={`site ${display.variable} ${body.variable}`}>
      <a href="#main" className="skip">
        Skip to content
      </a>
      <SiteHeader />
      <main id="main">{children}</main>
      <SiteFooter contact={s.contact} social={s.social} />
    </div>
  );
}
