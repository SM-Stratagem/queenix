'use client';
import { useParams } from 'next/navigation';
import { useQuery } from 'convex/react';
import { api } from '@queenix/convex';
import { EmptyState, QueryBoundary, Skeleton } from '@/components/admin/QueryBoundary';
import { PostEditor } from '@/components/website/PostEditor';
import { WebsiteHeader } from '@/components/website/WebsiteHeader';

function Editor({ id }: { id: string }) {
  const post = useQuery(api.queries.siteAdmin.getPost, { id: id as never });
  if (post === undefined) return <Skeleton height={400} />;
  if (post === null) return <EmptyState message="This post no longer exists." />;
  return <PostEditor key={post._id} post={post} />;
}

export default function EditPostPage() {
  const { id } = useParams<{ id: string }>();
  return (
    <div style={{ maxWidth: 1200 }}>
      <WebsiteHeader title="Edit post" subtitle="Changes to a published post go live when you save." viewHref="/blog" />
      <QueryBoundary fallback={<EmptyState message="Post not found." />}>
        <Editor id={id} />
      </QueryBoundary>
    </div>
  );
}
