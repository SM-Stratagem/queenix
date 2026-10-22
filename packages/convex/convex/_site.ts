/**
 * Queenix Gym — public website content contract.
 *
 * The ONE place that defines each CMS section's shape and its default copy.
 * Public pages render `{ ...SITE_DEFAULTS[key], ...stored }`, so the site is
 * complete before anyone edits anything; console editors write the same shape.
 */

export type Cta = { label: string; href: string };

export type SiteSections = {
  hero: {
    eyebrow: string;
    headline: string;
    subheadline: string;
    primaryCta: Cta;
    secondaryCta: Cta;
    /** siteMedia id (album 'hero'); falls back to the first published hero image. */
    mediaId?: string;
  };
  about: {
    heading: string;
    body: string;
    highlights: { title: string; body: string }[];
  };
  testimonials: {
    items: { quote: string; name: string; detail: string }[];
  };
  contact: {
    address: string;
    phone: string;
    whatsapp: string;
    email: string;
    mapUrl: string;
    hours: { days: string; time: string }[];
  };
  social: { instagram: string; tiktok: string; facebook: string };
  appPromo: { heading: string; body: string; iosUrl: string; androidUrl: string };
  seo: { title: string; description: string };
};

export type SiteKey = keyof SiteSections;

export const SITE_KEYS: SiteKey[] = ['hero', 'about', 'testimonials', 'contact', 'social', 'appPromo', 'seo'];

export const SITE_DEFAULTS: SiteSections = {
  hero: {
    eyebrow: "Women-only fitness club",
    headline: 'Stronger, together.',
    subheadline:
      'A private, premium gym built for women — expert coaches, small-group classes, and a space that feels like yours.',
    primaryCta: { label: 'Book a free trial', href: '/contact' },
    secondaryCta: { label: 'See the timetable', href: '/schedule' },
  },
  about: {
    heading: 'Why Queenix',
    body:
      'Queenix is a women-only club designed around how you actually train: certified female coaches, modern equipment, and a calm, private floor with no audience.',
    highlights: [
      { title: 'Women-only, always', body: 'Private floor, female coaching team, and changing rooms designed for comfort.' },
      { title: 'Coaching that adapts', body: 'Personal training, small groups and programs that move with your goals.' },
      { title: 'More than a gym', body: 'Salon, café and valet on site — your whole routine in one visit.' },
    ],
  },
  testimonials: {
    items: [
      { quote: 'The first gym where I actually look forward to going. The coaches know my name and my goals.', name: 'Layla A.', detail: 'Member since 2024' },
      { quote: 'Small classes, real attention. I have never been this consistent.', name: 'Sara M.', detail: 'Reformer & strength' },
      { quote: 'Private, clean, and genuinely welcoming. Worth every dirham.', name: 'Noura K.', detail: 'Personal training' },
    ],
  },
  contact: {
    address: 'Queenix Gym, Dubai, United Arab Emirates',
    phone: '+971 4 000 0000',
    whatsapp: '+971 50 000 0000',
    email: 'hello@queenixgym.com',
    mapUrl: 'https://maps.google.com/?q=Dubai',
    hours: [
      { days: 'Saturday – Thursday', time: '6:00 – 23:00' },
      { days: 'Friday', time: '8:00 – 22:00' },
    ],
  },
  social: { instagram: 'https://instagram.com/', tiktok: 'https://tiktok.com/', facebook: 'https://facebook.com/' },
  appPromo: {
    heading: 'Your membership, in your pocket',
    body: 'Book classes, check in with your QR pass, pay and track progress — all in the Queenix app.',
    iosUrl: '#',
    androidUrl: '#',
  },
  seo: {
    title: 'Queenix Gym — women-only fitness club',
    description: 'Premium women-only gym with expert female coaches, small-group classes, salon and café.',
  },
};

export function isSiteKey(key: string): key is SiteKey {
  return (SITE_KEYS as string[]).includes(key);
}

/** Stored data merged over defaults (shallow — each section is replaced field by field). */
export function mergeSection<K extends SiteKey>(key: K, stored: unknown): SiteSections[K] {
  const base = SITE_DEFAULTS[key];
  if (!stored || typeof stored !== 'object') return base;
  return { ...base, ...(stored as Partial<SiteSections[K]>) };
}

/** Public URL for a siteMedia row: external url, else the stored file's URL. */
export async function mediaUrl(
  ctx: { storage: { getUrl: (id: any) => Promise<string | null> } },
  m: { url?: string; storageId?: any },
): Promise<string | null> {
  if (m.url) return m.url;
  if (m.storageId) return await ctx.storage.getUrl(m.storageId);
  return null;
}

/** 'Hello, World!' → 'hello-world'. */
export function slugify(title: string): string {
  return title
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}
