import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { Qr } from '@/components/site/Qr';
import { getSections, nowMinute, q, site } from '@/components/site/data';
import {
  ClassRow,
  Empty,
  GalleryStrip,
  PlanGrid,
  PostGrid,
  SectionHead,
  TrainerList,
  VisitDetails,
} from '@/components/site/blocks';
import { TrialForm } from '@/components/site/TrialForm';
import { fmtTime, relDay } from '@/components/site/format';
import { Mark } from '@/components/site/Logo';

export default async function HomePage() {
  const now = nowMinute();
  const [s, classes, plans, trainers, gallery, posts] = await Promise.all([
    getSections(),
    q(site.listSchedule, { now, days: 7, limit: 40 }),
    q(site.listPlans, {}),
    q(site.listTrainers, {}),
    q(site.listMedia, { album: 'gallery', limit: 8 }),
    q(site.listPosts, { limit: 3 }),
  ]);
  const next = classes.slice(0, 3);
  const [lead, ...quotes] = s.testimonials.items;

  return (
    <>
      {/* Hero: the promise, the action, and the club's live board as proof. */}
      <section className="hero wrap" aria-labelledby="hero-title">
        <div className="hero-copy">
          <h1 id="hero-title" className="display hero-title">
            {s.hero.headline}
          </h1>
          <p className="hero-sub">{s.hero.subheadline}</p>
          <div className="hero-ctas">
            <Link href={s.hero.primaryCta.href} className="btn btn--solid btn--lg">
              {s.hero.primaryCta.label} <ArrowRight size={18} aria-hidden />
            </Link>
            <Link href={s.hero.secondaryCta.href} className="btn btn--ghost btn--lg">
              {s.hero.secondaryCta.label}
            </Link>
          </div>
        </div>
        <div className="hero-media">
          <p className="hero-tag">
            <Mark size={20} /> {s.hero.eyebrow}
          </p>
          {s.heroImage ? (
            <img src={s.heroImage.url} alt={s.heroImage.alt} fetchPriority="high" />
          ) : (
            <div className="hero-fallback" aria-hidden>
              <Mark size={160} />
            </div>
          )}
          <aside className="board" aria-label="Next classes">
            <p className="board-title">
              <span className="live-dot" aria-hidden /> Up next at the club
            </p>
            {next.length > 0 ? (
              <ol>
                {next.map((c) => (
                  <li key={c.id}>
                    <span className="board-time">{fmtTime(c.startsAt)}</span>
                    <span className="board-name">{c.name}</span>
                    <span className="board-day">{relDay(c.startsAt, now)}</span>
                  </li>
                ))}
              </ol>
            ) : (
              <p className="board-empty">New timetable coming soon.</p>
            )}
          </aside>
        </div>
      </section>

      {/* About */}
      <section className="about wrap" aria-labelledby="about-title">
        <div className="about-intro">
          <h2 id="about-title" className="display">
            {s.about.heading}
          </h2>
          <p className="lede">{s.about.body}</p>
        </div>
        <ul className="highlights">
          {s.about.highlights.map((h) => (
            <li key={h.title}>
              <Mark size={30} className="hl-mark" />
              <div>
                <h3>{h.title}</h3>
                <p>{h.body}</p>
              </div>
            </li>
          ))}
        </ul>
      </section>

      {/* Live timetable */}
      <section className="band band--blue" aria-labelledby="tt-title">
        <div className="wrap">
          <SectionHead id="tt-title" title="This week on the floor" href="/schedule" cta="Full timetable" />
          {classes.length > 0 ? (
            <ul className="class-list">
              {classes.slice(0, 6).map((c) => (
                <ClassRow key={c.id} c={c} now={now} />
              ))}
            </ul>
          ) : (
            <Empty title="The new timetable is on its way">
              Classes for the coming week haven’t been published yet. Book a free trial and we’ll find a session that
              fits you.
            </Empty>
          )}
        </div>
      </section>

      {/* Coaches */}
      {trainers.length > 0 && (
        <section className="wrap section" aria-labelledby="coach-title">
          <SectionHead id="coach-title" title="Coached by women who get it" />
          <TrainerList trainers={trainers} />
        </section>
      )}

      {/* Plans */}
      <section className="section section--mist" aria-labelledby="plan-title">
        <div className="wrap">
          <SectionHead id="plan-title" title="Memberships" />
          <p className="lede section-lede">Every membership starts with a free trial visit.</p>
          {plans.length > 0 ? (
            <PlanGrid plans={plans} />
          ) : (
            <Empty title="Plans are being updated">Ask us about current memberships — we’ll reply the same day.</Empty>
          )}
        </div>
      </section>

      {/* Gallery strip */}
      {gallery.length > 0 && (
        <section className="section section--flush" aria-labelledby="gal-title">
          <div className="wrap">
            <SectionHead id="gal-title" title="Inside Queenix" href="/gallery" cta="See the gallery" />
          </div>
          <GalleryStrip items={gallery} />
        </section>
      )}

      {/* Testimonials */}
      {lead && (
        <section className="wrap section voices" aria-label="What members say">
          <figure className="voice voice--lead">
            <blockquote>“{lead.quote}”</blockquote>
            <figcaption>
              <strong>{lead.name}</strong> {lead.detail}
            </figcaption>
          </figure>
          <div className="voice-rest">
            {quotes.map((t) => (
              <figure key={t.name} className="voice">
                <blockquote>“{t.quote}”</blockquote>
                <figcaption>
                  <strong>{t.name}</strong> {t.detail}
                </figcaption>
              </figure>
            ))}
          </div>
        </section>
      )}

      {/* Latest posts */}
      <section className="wrap section" aria-labelledby="blog-title">
        <SectionHead id="blog-title" title="From the journal" href="/blog" cta="All posts" />
        {posts.length > 0 ? (
          <PostGrid posts={posts} lead />
        ) : (
          <Empty title="First posts coming soon">Training tips, class guides and club news will live here.</Empty>
        )}
      </section>

      {/* Visit */}
      <section className="section section--mist" aria-labelledby="visit-title">
        <div className="wrap">
          <SectionHead id="visit-title" title="Visit the club" href="/contact" cta="Contact" />
          <VisitDetails contact={s.contact} />
        </div>
      </section>

      {/* App promo */}
      <section className="band band--ink" aria-labelledby="app-title">
        <div className="wrap app">
          <div className="app-copy">
            <h2 id="app-title" className="display">
              {s.appPromo.heading}
            </h2>
            <p className="lede">{s.appPromo.body}</p>
            <div className="app-stores">
              <a href={s.appPromo.iosUrl} className="btn btn--white">
                App Store
              </a>
              <a href={s.appPromo.androidUrl} className="btn btn--outline-white">
                Google Play
              </a>
            </div>
          </div>
          <div className="pass" aria-hidden>
            <div className="pass-top">
              <Mark size={40} />
              <span>Member pass</span>
            </div>
            <Qr className="pass-qr" />
            <p className="pass-foot">Scan at the gate</p>
          </div>
        </div>
      </section>

      {/* Trial CTA */}
      <section className="band band--blue trial" id="trial" aria-labelledby="trial-title">
        <div className="wrap trial-grid">
          <div>
            <h2 id="trial-title" className="display">
              Your first visit is on us
            </h2>
            <p className="lede">
              Tour the club, meet a coach and try a class. Leave your number and we’ll call to book a time that works
              for you.
            </p>
          </div>
          <TrialForm tone="blue" />
        </div>
      </section>
    </>
  );
}
