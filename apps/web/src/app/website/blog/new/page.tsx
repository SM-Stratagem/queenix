'use client';
import { PostEditor } from '@/components/website/PostEditor';
import { WebsiteHeader } from '@/components/website/WebsiteHeader';

export default function NewPostPage() {
  return (
    <div style={{ maxWidth: 1200 }}>
      <WebsiteHeader title="New post" subtitle="Starts as a draft — nothing is public until you publish." viewHref="/blog" />
      <PostEditor />
    </div>
  );
}
