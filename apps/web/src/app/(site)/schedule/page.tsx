import type { Metadata } from 'next';
import Link from 'next/link';
import { nowMinute, q, site } from '@/components/site/data';
import { ClassRow, Empty, PageHead } from '@/components/site/blocks';
import { dayKey, fmtDay, relDay } from '@/components/site/format';

/** 'Today' / 'Tomorrow' / weekday name. */
const dayLabel = (ms: number, now: number) => {
  const r = relDay(ms, now);
  return r === 'Today' || r === 'Tomorrow' ? r : fmtDay(ms).split(' ')[0]!;
};

export const metadata: Metadata = {
  title: 'Class timetable',
  description: 'Live timetable for the week ahead: yoga, Pilates reformer, HIIT, spin and strength classes at Queenix.',
  openGraph: { title: 'Class timetable · Queenix Gym' },
};

export default async function SchedulePage() {
  const now = nowMinute();
  const classes = await q(site.listSchedule, { now, days: 7, limit: 200 });
  const days = new Map<string, typeof classes>();
  for (const c of classes) {
    const k = dayKey(c.startsAt);
    days.set(k, [...(days.get(k) ?? []), c]);
  }

  return (
    <>
      <PageHead
        title="Timetable"
        lede="The next seven days of classes, live from the club. Times are Dubai time; members book in the Queenix app."
      />
      <div className="wrap schedule">
        {days.size === 0 ? (
          <Empty title="No classes published yet">
            The coming week’s timetable hasn’t been posted. <Link href="/contact#trial">Book a free trial</Link> and we’ll
            match you with a session.
          </Empty>
        ) : (
          [...days.values()].map((list) => {
            const first = list[0]!;
            return (
              <section key={dayKey(first.startsAt)} className="day" aria-label={fmtDay(first.startsAt)}>
                <h2 className="day-title">
                  <span>{dayLabel(first.startsAt, now)}</span> {fmtDay(first.startsAt).replace(/^\w+ /, '')}
                </h2>
                <ul className="class-list class-list--light">
                  {list.map((c) => (
                    <ClassRow key={c.id} c={c} now={now} showDay={false} />
                  ))}
                </ul>
              </section>
            );
          })
        )}
      </div>
    </>
  );
}
