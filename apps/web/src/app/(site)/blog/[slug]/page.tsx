import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { q, site } from '@/components/site/data';
import { PostGrid, SectionHead } from '@/components/site/blocks';
import { renderMarkdown } from '@/components/site/markdown';
import { fmtDate } from '@/components/site/format';

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const post = await q(site.getPostBySlug, { slug: (await params).slug });
  if (!post) return { title: 'Post not found' };
  return {
    title: post.title,
    description: post.excerpt,
    alternates: { canonical: `/blog/${post.slug}` },
    openGraph: {
      type: 'article',
      title: post.title,
      description: post.excerpt,
      publishedTime: new Date(post.publishedAt).toISOString(),
      tags: post.tags,
      images: post.cover ? [{ url: post.cover.url, alt: post.cover.alt }] : undefined,
    },
  };
}

export default async function PostPage({ params }: Props) {
  const { slug } = await params;
  const [post, all] = await Promise.all([q(site.getPostBySlug, { slug }), q(site.listPosts, { limit: 4 })]);
  if (!post) notFound();
  const more = all.filter((p) => p.slug !== post.slug).slice(0, 3);

  return (
    <article className="article">
      <header className="wrap article-head">
        <Link href="/blog" className="text-link back">
          <ArrowLeft size={16} aria-hidden /> Journal
        </Link>
        <h1 className="display">{post.title}</h1>
        <p className="lede">{post.excerpt}</p>
        <p className="post-meta">
          <time dateTime={new Date(post.publishedAt).toISOString()}>{fmtDate(post.publishedAt)}</time>
          {post.tags.map((t) => (
            <span key={t}>{t}</span>
          ))}
        </p>
      </header>
      {post.cover && (
        <div className="wrap article-cover">
          <img src={post.cover.url} alt={post.cover.alt} />
        </div>
      )}
      <div className="wrap">
        <div className="prose" dangerouslySetInnerHTML={{ __html: renderMarkdown(post.body) }} />
      </div>
      {more.length > 0 && (
        <aside className="wrap section" aria-labelledby="more-title">
          <SectionHead id="more-title" title="Keep reading" href="/blog" cta="All posts" />
          <PostGrid posts={more} />
        </aside>
      )}
    </article>
  );
}
