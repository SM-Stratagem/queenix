import type { Metadata } from 'next';
import { q, site } from '@/components/site/data';
import { Empty, PageHead } from '@/components/site/blocks';

export const metadata: Metadata = {
  title: 'Gallery',
  description: 'Take a look inside Queenix: the strength floor, studios, classes and the people who make it.',
  openGraph: { title: 'Gallery · Queenix Gym' },
};

export default async function GalleryPage() {
  const items = await q(site.listMedia, { album: 'gallery', limit: 120 });
  return (
    <>
      <PageHead title="Gallery" lede="The floor, the studios and the people. A look inside the club before your first visit." />
      <div className="wrap">
        {items.length === 0 ? (
          <Empty title="Photos coming soon">We’re shooting the club right now. Come and see it in person meanwhile.</Empty>
        ) : (
          <ul className="masonry">
            {items.map((m) => (
              <li key={m.id}>
                <figure>
                  <img src={m.url} alt={m.alt} loading="lazy" />
                  {m.caption && <figcaption>{m.caption}</figcaption>}
                </figure>
              </li>
            ))}
          </ul>
        )}
      </div>
    </>
  );
}
