'use client';
/** Website CMS — blog posts list (drafts + published) with a status filter. */
import { useState } from 'react';
import Link from 'next/link';
import { useQuery } from 'convex/react';
import { api } from '@queenix/convex';
import { Plus } from 'lucide-react';
import { EmptyState, QueryBoundary, Skeleton } from '@/components/admin/QueryBoundary';
import { btnPrimary, card } from '@/components/admin/styles';
import { StatusBadge } from '@/components/website/PostEditor';
import { WebsiteHeader } from '@/components/website/WebsiteHeader';

type Filter = '' | 'draft' | 'published';

function Posts({ status }: { status: Filter }) {
  const posts = useQuery(api.queries.siteAdmin.listPosts, status ? { status } : {});
  if (posts === undefined) return <Skeleton height={200} />;
  if (posts.length === 0) {
    return <EmptyState message={status ? `No ${status} posts.` : 'No posts yet — write the first one.'} />;
  }
  return (
    <ul aria-label="Posts" style={{ ...card, padding: 0, listStyle: 'none', margin: 0 }}>
      {posts.map((p, i) => (
        <li key={p._id} style={{ borderTop: i ? '1px solid var(--border)' : 'none' }}>
          <Link
            href={`/website/blog/${p._id}`}
            style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px', flexWrap: 'wrap' }}
          >
            <div style={{ flex: '1 1 240px', minWidth: 0 }}>
              <div style={{ fontWeight: 700, color: 'var(--text)' }}>{p.title}</div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                /blog/{p.slug}
                {p.tags.length > 0 && ` · ${p.tags.join(', ')}`}
              </div>
            </div>
            <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
              {p.status === 'published' && p.publishedAt
                ? `Published ${new Date(p.publishedAt).toLocaleDateString()}`
                : `Edited ${new Date(p.updatedAt).toLocaleDateString()}`}
            </span>
            <StatusBadge status={p.status} />
          </Link>
        </li>
      ))}
    </ul>
  );
}

export default function WebsiteBlogPage() {
  const [status, setStatus] = useState<Filter>('');
  return (
    <div style={{ maxWidth: 920 }}>
      <WebsiteHeader title="Blog" subtitle="Drafts stay private; published posts appear on /blog." viewHref="/blog" />
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', marginBottom: 12 }}>
        <label style={{ fontSize: 13, color: 'var(--text-muted)', display: 'inline-flex', alignItems: 'center', gap: 8 }}>
          Status
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value as Filter)}
            style={{ padding: '6px 10px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--text)', fontSize: 13 }}
          >
            <option value="">All</option>
            <option value="draft">Drafts</option>
            <option value="published">Published</option>
          </select>
        </label>
        <Link href="/website/blog/new" style={{ ...btnPrimary, marginLeft: 'auto', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
          <Plus size={14} /> New post
        </Link>
      </div>
      <QueryBoundary>
        <Posts status={status} />
      </QueryBoundary>
    </div>
  );
}
