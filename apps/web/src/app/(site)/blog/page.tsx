import type { Metadata } from 'next';
import { q, site } from '@/components/site/data';
import { Empty, PageHead, PostGrid } from '@/components/site/blocks';

export const metadata: Metadata = {
  title: 'Journal',
  description: 'Training guides, class explainers and club news from the Queenix coaching team.',
  openGraph: { title: 'Journal · Queenix Gym' },
};

export default async function BlogPage() {
  const posts = await q(site.listPosts, { limit: 60 });
  return (
    <>
      <PageHead title="Journal" lede="Training guides, class explainers and news from the coaching team." />
      <div className="wrap section-tight">
        {posts.length === 0 ? (
          <Empty title="No posts yet">The first articles from our coaches are on their way.</Empty>
        ) : (
          <PostGrid posts={posts} lead />
        )}
      </div>
    </>
  );
}
