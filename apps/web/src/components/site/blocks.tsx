/** Shared building blocks for the public site (server components). */
import Link from 'next/link';
import { ArrowRight, ArrowUpRight, Check, Mail, MapPin, MessageCircle, Phone, Star } from 'lucide-react';
import type { ClassItem, Media, Plan, PostCard, Sections, Trainer } from './data';
import { fmtDate, fmtPeriod, fmtPrice, fmtTime, relDay } from './format';
import { Mark } from './Logo';

export function PageHead({ title, lede, children }: { title: string; lede?: string; children?: React.ReactNode }) {
  return (
    <header className="page-head wrap">
      <h1 className="display">{title}</h1>
      {lede && <p className="lede">{lede}</p>}
      {children}
    </header>
  );
}

export function Empty({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="empty">
      <Mark size={56} className="empty-mark" />
      <h3>{title}</h3>
      <p>{children}</p>
    </div>
  );
}

/** Five bars, filled by share of spots still open — the logo's bars as a capacity meter. */
function Spots({ left }: { left: number }) {
  const label = left === 0 ? 'Full — join the waitlist' : left <= 3 ? `${left} spot${left === 1 ? '' : 's'} left` : `${left} spots open`;
  const lit = left === 0 ? 0 : Math.min(5, Math.max(1, Math.ceil(left / 3)));
  return (
    <span className={`spots${left <= 3 ? ' spots--low' : ''}`}>
      <span className="spots-bars" aria-hidden>
        {[0, 1, 2, 3, 4].map((i) => (
          <i key={i} className={i < lit ? 'on' : undefined} />
        ))}
      </span>
      {label}
    </span>
  );
}

export function ClassRow({ c, now, showDay = true }: { c: ClassItem; now: number; showDay?: boolean }) {
  const mins = Math.round((c.endsAt - c.startsAt) / 60000);
  return (
    <li className="class-row">
      <div className="class-when">
        <span className="class-time">{fmtTime(c.startsAt)}</span>
        {showDay && <span className="class-day">{relDay(c.startsAt, now)}</span>}
      </div>
      <div className="class-what">
        <span className="class-name">{c.name}</span>
        <span className="class-meta">
          {[c.coach && `with ${c.coach.split(' ')[0]}`, `${mins} min`, c.category, c.difficulty && c.difficulty[0]!.toUpperCase() + c.difficulty.slice(1)].filter(Boolean).join(' · ')}
        </span>
      </div>
      <Spots left={c.spotsLeft} />
    </li>
  );
}

export function PlanGrid({ plans }: { plans: Plan[] }) {
  const featured = plans.length >= 3 ? Math.floor(plans.length / 2) : -1;
  return (
    <ul className="plans">
      {plans.map((p, i) => (
        <li key={p.id} className={`plan${i === featured ? ' plan--featured' : ''}`}>
          {i === featured && <span className="plan-flag">Most chosen</span>}
          <h3 className="plan-name">{p.name}</h3>
          <p className="plan-desc">{p.description}</p>
          <p className="plan-price">
            <span className="plan-amount">{fmtPrice(p.priceCents, p.currency)}</span>
            <span className="plan-per">/ {fmtPeriod(p.durationDays)}</span>
          </p>
          <ul className="plan-features">
            {p.features.map((f) => (
              <li key={f}>
                <Check size={16} aria-hidden /> {f}
              </li>
            ))}
          </ul>
          <Link href={`/contact?plan=${encodeURIComponent(p.name)}#trial`} className={`btn ${i === featured ? 'btn--white' : 'btn--outline'}`}>
            Try it free first <ArrowRight size={16} aria-hidden />
          </Link>
        </li>
      ))}
    </ul>
  );
}

export function TrainerList({ trainers }: { trainers: Trainer[] }) {
  return (
    <ul className={`coaches${trainers.length === 1 ? ' coaches--solo' : ''}`}>
      {trainers.map((t) => (
        <li key={t.id} className="coach">
          <div className="coach-photo">
            {t.imageUrl ? (
              <img src={t.imageUrl} alt={`Portrait of coach ${t.name}`} loading="lazy" />
            ) : (
              <span className="coach-initials" aria-hidden>
                {t.name
                  .split(' ')
                  .map((w) => w[0])
                  .slice(0, 2)
                  .join('')}
              </span>
            )}
          </div>
          <div className="coach-body">
            <h3>{t.name}</h3>
            {t.rating !== null && (
              <p className="coach-rating">
                <Star size={15} aria-hidden fill="currentColor" /> {t.rating.toFixed(1)}
                <span> from {t.reviewCount} member reviews</span>
              </p>
            )}
            {t.bio && <p className="coach-bio">{t.bio}</p>}
            <ul className="chips">
              {t.specialties.map((s) => (
                <li key={s}>{s}</li>
              ))}
            </ul>
          </div>
        </li>
      ))}
    </ul>
  );
}

export function PostGrid({ posts, lead = false }: { posts: PostCard[]; lead?: boolean }) {
  return (
    <ul className={`posts${lead ? ' posts--lead' : ''}`}>
      {posts.map((p) => (
        <li key={p.slug} className="post">
          <Link href={`/blog/${p.slug}`} className="post-link">
            <div className="post-cover">
              {p.cover ? <img src={p.cover.url} alt={p.cover.alt} loading="lazy" /> : <Mark size={64} />}
            </div>
            <p className="post-meta">
              <time dateTime={new Date(p.publishedAt).toISOString()}>{fmtDate(p.publishedAt)}</time>
              {p.tags[0] && <span>{p.tags[0]}</span>}
            </p>
            <h3 className="post-title">{p.title}</h3>
            <p className="post-excerpt">{p.excerpt}</p>
          </Link>
        </li>
      ))}
    </ul>
  );
}

export function GalleryStrip({ items }: { items: Media[] }) {
  return (
    <ul className="strip" aria-label="Photos from the club">
      {items.map((m) => (
        <li key={m.id}>
          <img src={m.url} alt={m.alt} loading="lazy" />
        </li>
      ))}
    </ul>
  );
}

const tel = (s: string) => s.replace(/[^\d+]/g, '');

export function VisitDetails({ contact }: { contact: Sections['contact'] }) {
  return (
    <div className="visit">
      <div className="visit-col">
        <h3>Find us</h3>
        <p className="visit-address">
          <MapPin size={18} aria-hidden /> {contact.address}
        </p>
        <a href={contact.mapUrl} target="_blank" rel="noopener noreferrer" className="text-link">
          Open in Maps <ArrowUpRight size={16} aria-hidden />
        </a>
      </div>
      <div className="visit-col">
        <h3>Opening hours</h3>
        <dl className="hours">
          {contact.hours.map((h) => (
            <div key={h.days}>
              <dt>{h.days}</dt>
              <dd>{h.time}</dd>
            </div>
          ))}
        </dl>
      </div>
      <div className="visit-col">
        <h3>Talk to us</h3>
        <ul className="contact-list">
          <li>
            <a href={`tel:${tel(contact.phone)}`}>
              <Phone size={18} aria-hidden /> {contact.phone}
            </a>
          </li>
          <li>
            <a href={`https://wa.me/${tel(contact.whatsapp).replace('+', '')}`} target="_blank" rel="noopener noreferrer">
              <MessageCircle size={18} aria-hidden /> WhatsApp {contact.whatsapp}
            </a>
          </li>
          <li>
            <a href={`mailto:${contact.email}`}>
              <Mail size={18} aria-hidden /> {contact.email}
            </a>
          </li>
        </ul>
      </div>
    </div>
  );
}

/** Section heading row: title left, optional link right. */
export function SectionHead({ id, title, href, cta }: { id?: string; title: string; href?: string; cta?: string }) {
  return (
    <div className="section-head">
      <h2 id={id} className="display">
        {title}
      </h2>
      {href && cta && (
        <Link href={href} className="text-link">
          {cta} <ArrowRight size={16} aria-hidden />
        </Link>
      )}
    </div>
  );
}
