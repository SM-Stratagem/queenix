'use client';
/**
 * Website CMS — section content editor. One card per SITE_KEYS section
 * (queries/siteAdmin:sections → mutations/site:saveSection).
 */
import { useQuery } from 'convex/react';
import { api } from '@queenix/convex';
import { QueryBoundary, Skeleton } from '@/components/admin/QueryBoundary';
import { SectionForm } from '@/components/website/SectionForm';
import { WebsiteHeader } from '@/components/website/WebsiteHeader';

function Sections() {
  const sections = useQuery(api.queries.siteAdmin.sections, {});
  if (sections === undefined) {
    return (
      <div style={{ display: 'grid', gap: 16 }}>
        <Skeleton height={260} />
        <Skeleton height={180} />
      </div>
    );
  }
  return (
    <div style={{ display: 'grid', gap: 16 }}>
      {sections.map((s) => (
        <SectionForm key={s.key} sectionKey={s.key} data={s.data} updatedAt={s.updatedAt} />
      ))}
    </div>
  );
}

export default function WebsiteContentPage() {
  return (
    <div style={{ maxWidth: 920 }}>
      <WebsiteHeader title="Website content" subtitle="Edit the public website's copy section by section. Each save goes live immediately." />
      <QueryBoundary>
        <Sections />
      </QueryBoundary>
    </div>
  );
}
