/**
 * Queenix Gym — public website starter content (dev/demo).
 *
 * Unsplash stock photos (external `url`, no upload) for the hero + gallery +
 * blog covers, three published sample posts, and a rolling week of upcoming
 * classes for the existing class types. Idempotent: each album / the blog is
 * only filled when it has no rows yet (staff edits are never overwritten), and
 * classes only fill empty (type, day) slots. Internal: run by scripts/seed-demo-users.mjs with the admin key.
 */

import { v } from 'convex/values';
import { internalMutation } from './_generated/server';
import type { Id } from './_generated/dataModel';

const DAY = 24 * 60 * 60 * 1000;
const DUBAI_OFFSET = 4 * 60 * 60 * 1000; // UTC+4, no DST
/** Class start times, minutes after Dubai midnight (06:30, 09:00, 12:15, 18:00, 19:30, 20:45). */
const SLOTS_DUBAI = [390, 540, 735, 1080, 1170, 1245];
const img = (id: string) => `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=1600&q=75`;

type Seed = { id: string; alt: string; caption?: string };

const HERO: Seed[] = [
  { id: '1518644961665-ed172691aaa1', alt: 'Two women high-fiving mid-workout on a bright studio floor' },
  { id: '1541534741688-6078c6bfb5c5', alt: 'Woman pressing a barbell overhead in a squat rack' },
];

const GALLERY: Seed[] = [
  { id: '1518611012118-696072aa579a', alt: 'Small group of women training on mats in a sunlit studio', caption: 'Small-group sculpt' },
  { id: '1541534741688-6078c6bfb5c5', alt: 'Woman pressing a barbell overhead in a squat rack', caption: 'Strength floor' },
  { id: '1552196563-55cd4e45efb3', alt: 'Woman seated cross-legged on a yoga mat, stretching', caption: 'Mobility & recovery' },
  { id: '1518310383802-640c2de311b2', alt: 'Women holding dumbbells overhead in a group class', caption: 'Group classes' },
  { id: '1540497077202-7c8a3999166f', alt: 'Bright gym floor lined with bikes and strength machines', caption: 'The main floor' },
  { id: '1571019613454-1cb2f99b2d8b', alt: 'Woman doing crunches on a mat beside a tall window', caption: 'Core work' },
  { id: '1600881333168-2ef49b341f30', alt: 'Woman in a downward-dog stretch on a teal mat', caption: 'Pilates & stretch' },
  { id: '1574680096145-d05b474e2155', alt: 'Black-and-white photo of a woman with a barbell across her back', caption: 'Coached lifting' },
  { id: '1544367567-0f2fcb009e0b', alt: 'Silhouette of a woman in a yoga pose against a pink sunset', caption: 'Sunset flow' },
  { id: '1620188467120-5042ed1eb5da', alt: 'Barbell plates racked beside a squat cage', caption: 'Free weights' },
];

const BLOG_COVERS: Seed[] = [
  { id: '1574680096145-d05b474e2155', alt: 'Woman with a barbell across her back, ready to squat' },
  { id: '1600881333168-2ef49b341f30', alt: 'Woman stretching in a downward-dog pose on a mat' },
  { id: '1584735935682-2f2b69dff9d2', alt: 'Dumbbells and a resistance band on a wooden floor' },
];

const POSTS = [
  {
    slug: 'strength-training-for-women-where-to-start',
    title: 'Strength training for women: where to start',
    excerpt: 'Lifting won’t make you bulky — it makes you capable. Here is a simple first month on the strength floor.',
    tags: ['strength', 'beginners'],
    body: `Walking onto a weights floor for the first time can feel like walking into someone else’s house. At Queenix the floor is yours — and lifting is the single best thing most of us can add to our week.

## Why lift?

- **Stronger bones.** Load is what tells bone to stay dense, especially after 30.
- **Easier everyday life.** Carrying shopping, kids and suitcases gets lighter.
- **Better metabolism.** Muscle is active tissue; it keeps working between sessions.

## Your first four weeks

1. **Week 1–2:** learn five patterns — squat, hinge, push, pull, carry. Light weights, perfect reps.
2. **Week 3:** add a little load when the last two reps of a set still feel smooth.
3. **Week 4:** keep a simple log. Seeing numbers climb is the best motivation there is.

> Start lighter than your ego wants. Consistency beats intensity every single time.

Not sure where to begin? Book a free trial and one of our coaches will walk you through your first session.`,
  },
  {
    slug: 'your-first-reformer-pilates-class',
    title: 'Your first reformer Pilates class, explained',
    excerpt: 'Springs, straps and a sliding carriage — what actually happens in a reformer class, and how to prepare.',
    tags: ['pilates', 'classes'],
    body: `The reformer looks like a piece of medieval machinery, but it is one of the kindest ways to build strength.

## What to expect

Classes are small — never more than twelve — so your coach can adjust springs and form for you. You will work lying down, kneeling and standing, with the springs adding either resistance or support.

## What to bring

- Grip socks (we have them at the desk if you forget)
- A water bottle
- Fitted clothing, so your coach can see your alignment

## After class

Expect to feel muscles you didn’t know you had — especially deep core and glutes. That is normal. Two classes a week is the sweet spot for most members.`,
  },
  {
    slug: 'fuel-your-training-in-the-uae-heat',
    title: 'Fuel your training in the UAE heat',
    excerpt: 'Hydration, salt and timing: small habits that make a big difference to how you feel in every session.',
    tags: ['nutrition', 'wellbeing'],
    body: `Training in a hot climate asks more of your body before you have even started your warm-up.

## Hydrate early

Drink steadily through the day rather than all at once before class. A pale straw colour is the goal.

## Don’t forget salt

If you sweat heavily, water alone isn’t enough. An electrolyte tablet or a pinch of salt in your bottle helps on long or intense days.

## Eat for the session

| Session time | Before | After |
| --- | --- | --- |
| Early morning | Banana or dates | Eggs and toast |
| Midday | Light lunch 2h before | Yoghurt and fruit |
| Evening | Snack at 4pm | Balanced dinner |

Our café keeps protein smoothies and electrolyte drinks ready for after class.`,
  },
];

export const seedSiteContent = internalMutation({
  args: {},
  returns: v.object({ media: v.number(), posts: v.number(), classes: v.number() }),
  handler: async (ctx) => {
    const now = Date.now();
    let media = 0;
    const fill = async (album: 'hero' | 'gallery' | 'blog', items: Seed[]) => {
      const existing = await ctx.db
        .query('siteMedia')
        .withIndex('by_album_order', (q) => q.eq('album', album))
        .take(1);
      if (existing.length > 0) return null;
      const ids: Id<'siteMedia'>[] = [];
      for (let i = 0; i < items.length; i++) {
        const s = items[i]!;
        ids.push(
          await ctx.db.insert('siteMedia', {
            url: img(s.id),
            alt: s.alt,
            caption: s.caption,
            album,
            order: i,
            published: true,
            createdAt: now,
          }),
        );
        media++;
      }
      return ids;
    };
    await fill('hero', HERO);
    await fill('gallery', GALLERY);
    const covers = await fill('blog', BLOG_COVERS);

    let posts = 0;
    const anyPost = await ctx.db.query('blogPosts').take(1);
    if (anyPost.length === 0) {
      for (let i = 0; i < POSTS.length; i++) {
        const p = POSTS[i]!;
        const publishedAt = now - (i * 9 + 2) * DAY;
        await ctx.db.insert('blogPosts', {
          ...p,
          coverMediaId: covers?.[i],
          status: 'published',
          publishedAt,
          createdAt: publishedAt,
          updatedAt: publishedAt,
        });
        posts++;
      }
    }
    // Rolling week of upcoming classes for the existing class types, so the
    // public timetable is never empty on a long-running demo stack. Fills only
    // (type, day) slots that have no class yet; bookedCount 0 = no fake bookings.
    let classes = 0;
    const types = await ctx.db.query('classTypes').take(SLOTS_DUBAI.length);
    const todayDubai = Math.floor((now + DUBAI_OFFSET) / DAY) * DAY - DUBAI_OFFSET;
    for (let d = 0; d < 7; d++) {
      const dayStart = todayDubai + d * DAY;
      const sameDay = await ctx.db
        .query('classInstances')
        .withIndex('by_startsAt', (q) => q.gte('startsAt', dayStart).lt('startsAt', dayStart + DAY))
        .take(100);
      for (let i = 0; i < types.length; i++) {
        const t = types[i]!;
        const startsAt = dayStart + SLOTS_DUBAI[i]! * 60 * 1000;
        if (startsAt <= now || sameDay.some((c) => c.classTypeId === t._id)) continue;
        await ctx.db.insert('classInstances', {
          classTypeId: t._id,
          trainerId: t.trainerId,
          startsAt,
          endsAt: startsAt + t.durationMinutes * 60 * 1000,
          capacity: t.capacity,
          bookedCount: 0,
          waitlistCount: 0,
          status: 'scheduled',
          notes: 'site-seed',
        });
        classes++;
      }
    }
    return { media, posts, classes };
  },
});
