import Link from 'next/link';
import { Empty } from '@/components/site/blocks';

export default function SiteNotFound() {
  return (
    <div className="wrap section">
      <Empty title="We couldn’t find that page">
        It may have moved or been unpublished. <Link href="/blog">Browse the journal</Link> or{' '}
        <Link href="/">head back home</Link>.
      </Empty>
    </div>
  );
}
