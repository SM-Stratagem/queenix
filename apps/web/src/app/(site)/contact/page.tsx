import type { Metadata } from 'next';
import { getSections } from '@/components/site/data';
import { PageHead, VisitDetails } from '@/components/site/blocks';
import { TrialForm } from '@/components/site/TrialForm';

export const metadata: Metadata = {
  title: 'Contact & free trial',
  description: 'Book a free trial visit at Queenix, the women-only fitness club. Address, opening hours, phone and WhatsApp.',
  openGraph: { title: 'Contact & free trial · Queenix Gym' },
};

type Props = { searchParams: Promise<{ plan?: string | string[] }> };

export default async function ContactPage({ searchParams }: Props) {
  const [s, sp] = await Promise.all([getSections(), searchParams]);
  const plan = typeof sp.plan === 'string' ? sp.plan.slice(0, 40) : undefined;
  return (
    <>
      <PageHead
        title="Come and try us"
        lede="Your first visit is free: a tour, a chat with a coach and a class of your choice. Leave your details and we’ll call you."
      />
      <div className="wrap contact-grid">
        <section id="trial" aria-labelledby="form-title" className="contact-form">
          <h2 id="form-title" className="h-sub">
            Book a free trial
          </h2>
          <TrialForm plan={plan} />
        </section>
        <section aria-label="Club details" className="contact-details">
          <VisitDetails contact={s.contact} />
        </section>
      </div>
    </>
  );
}
