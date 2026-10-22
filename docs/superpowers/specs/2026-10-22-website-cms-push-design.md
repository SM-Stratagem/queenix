# Public website, Website CMS, and phone push — design

Approved 2026-10-22. Three workstreams on one shared foundation (already built).

## Decisions
- Public site lives in the existing Next app (`apps/web`). Staff dashboard moved `/` → `/dashboard`.
- Content: placeholder copy + Unsplash stock photos; staff replace via the CMS.
- Editors: operations + superadmin/admin via capability `content.manage` (grantable to anyone).
- Push: Expo Push API. Sending requires capability `notifications.push` (operations, admin, superadmin).

## Foundation (done — do not redesign)
- Schema `packages/convex/convex/schema/site.ts`: `siteContent` (key → data), `siteMedia` (storageId or external url, album gallery|hero|blog|general, order, published), `blogPosts` (slug, markdown body, draft|published, publishedAt, coverMediaId, tags).
- Contract `packages/convex/convex/_site.ts`: `SiteSections` types, `SITE_DEFAULTS` copy, `SITE_KEYS`, `mergeSection(key, stored)`, `mediaUrl(ctx, media)`, `slugify`. Public pages always render `mergeSection` output, so the site is complete with zero rows.
- Capabilities `content.manage`, `notifications.push` added in `permissions.ts` and both grant validators. Use `requireCapability(ctx, cap)` from `convex/permissions.ts` for every CMS/push write.
- `crmLeads.createdBy` is optional (website leads have no staff author; use `source: 'website'`).
- Web: `lib/access.ts` has `isPublicPath` (`/`, `/schedule`, `/gallery`, `/contact`, `/blog/**`) — those render WITHOUT the console frame/auth; `/website` route is console (operations + elevated). `WEB_LANDING` for superadmin/admin/operations is `/dashboard`.
- Deps installed (host + containers): `marked` (web), `expo-notifications`, `expo-device` (mobile). Do NOT run npm install.

## Workstream A — public website (owner: site agent)
Files: `apps/web/src/app/(site)/**`, `apps/web/src/components/site/**`, `apps/web/src/app/sitemap.ts`, `apps/web/src/app/robots.ts`, `packages/convex/convex/queries/site.ts`, `packages/convex/convex/mutations/publicLeads.ts`, `packages/convex/convex/siteSeed.ts`, one call added in `scripts/seed-demo-users.mjs`.
- Routes: `/` home, `/schedule`, `/gallery`, `/blog`, `/blog/[slug]`, `/contact`. Route group `(site)` with its own layout (header nav + footer). Root layout still wraps providers and forces `data-theme="dark"` on `<html>` — the site defines its own light palette under a `.site` wrapper class.
- Home sections: hero, about/highlights, live class timetable preview, trainers, membership plans (live from existing tables), gallery strip, testimonials, latest 3 posts, location/hours/contact, app promo, trial CTA.
- Public queries (no auth, published data only): section content, published media by album, published posts list + by slug, upcoming class schedule, public trainer cards, active membership plans. Never expose emails/phones of users or internal fields.
- Trial form on `/contact` (+ home CTA) → public mutation creating a `crmLeads` row (`source: 'website'`, stage `new`) with validation + basic abuse limits (length caps, honeypot field).
- Server-rendered for SEO (`convex/nextjs` `fetchQuery`), `generateMetadata` per page and per post, `sitemap.ts`, `robots.ts` (disallow console routes).
- Markdown via `marked` with raw HTML escaped (no script injection).
- Seed: idempotent internal mutation inserting Unsplash gallery/hero images (url field) and 3 published sample posts if none exist; called from the seed script.

## Workstream B — console Website CMS (owner: cms agent)
Files: `apps/web/src/app/website/**`, `apps/web/src/components/website/**`, `apps/web/src/components/admin/AdminNav.tsx` (add "Website" section: Content, Media, Blog), `packages/convex/convex/queries/siteAdmin.ts`, `packages/convex/convex/mutations/site.ts`.
- `/website` content editor: one form per `SITE_KEYS` section (lists editable: highlights, testimonials, hours), save per section, "View on site" link.
- `/website/media`: upload (Convex `generateUploadUrl`), alt text required, caption, album, reorder, publish toggle, delete (removes stored file too).
- `/website/blog`: list (draft/published), `/website/blog/new` + `/website/blog/[id]` editor: title, auto slug (editable, unique), excerpt, markdown body with live preview, cover from media library, tags, publish/unpublish.
- All writes `requireCapability(ctx, 'content.manage')`, audited via `audit()` from `_helpers.ts`.

## Workstream C — phone push (owner: push agent)
Files: `apps/mobile/lib/push.ts` (+ wire-in in `apps/mobile/app/_layout.tsx` after sign-in), `apps/mobile/app.json` (expo-notifications plugin), `packages/convex/convex/mutations/push.ts`, `packages/convex/convex/push.ts` (internal action), `packages/convex/convex/mutations/engagement.ts`, `apps/web/src/app/notifications/page.tsx`.
- Mobile: request permission, `getExpoPushTokenAsync({ projectId })` (projectId from `Constants.expoConfig.extra.eas.projectId`; skip gracefully when absent / Expo Go / simulator), upsert into the existing `devices` table via `registerPushToken`; clear on sign-out. Tap on a notification opens the notifications screen.
- `sendBroadcastNotification` gains `push?: boolean`; when true require `notifications.push`, then `ctx.scheduler.runAfter(0, internal.push.sendToUsers, …)`.
- Internal action: collect tokens for recipients, filter marketing pushes (`type: 'promotion'`) to users with a granted `marketing_push` consent, POST to `https://exp.host/--/api/v2/push/send` (env `EXPO_PUSH_URL` override) in batches of 100, clear tokens on `DeviceNotRegistered`, write one `auditEvents` row with sent/failed counts.
- Web composer: "Also send to phones" toggle shown only to users with `notifications.push`; result shows queued push count.

## Verification (every workstream)
- `npx tsc --noEmit` in the touched app/package; `npx vitest run` at root stays green; add one small vitest for any non-trivial pure logic.
- Live stack: web `http://10.12.19.174:3001` (Next dev, hot reload), Convex `:3210`, `convex-sync` auto-deploys — check `docker logs --since 2m queenix-convex-sync` after Convex edits.
- UI must be observed in a real browser (Playwright screenshots at 390px and 1440px), not just typechecked.
