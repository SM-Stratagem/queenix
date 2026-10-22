# Website editor guide

**Who this is for:** whoever keeps the public website up to date: its text,
photos and blog. That is the **operations** role, plus **admin** and
**superadmin**.

Anyone else (for example a finance user) can be given the extra
"edit website" permission, called `content.manage`, by a superadmin or admin.
That opens the **Website** section in their console menu too. See
[README](README.md#giving-one-extra-permission-without-a-new-role).

---

## The public website at a glance

Anyone can visit these pages; no sign-in needed.

| Page (menu) | Page title | Where its content comes from |
|---|---|---|
| **Home** | (your hero headline) | Mostly **Website** → **Content**, plus live data below |
| **Schedule** | **Timetable** | The live class timetable (next 7 days). Not edited here |
| **Gallery** | **Gallery** | Published photos in the **gallery** album (**Media**) |
| **Blog** | **Journal** | Published posts (**Blog**) |
| **Contact** | **Come and try us** | **Contact & hours** section, plus the free-trial form |

Every page has **Staff login** and **Book a free trial** at the top, and a
footer with **Explore**, **Hours** and **Follow**.

Live data you don't edit here:

- "Up next at the club", "This week on the floor" and the **Timetable** come
  from the class schedule.
- "Coached by women who get it" lists trainers from their trainer profiles.
- "Memberships" shows active plans from **Members & plans** → **Plans**
  (finance). Each plan's **Try it free first** button opens the contact form
  with the plan name filled in.

Free-trial requests: when someone fills in **Book a free trial**
(**Full name**, **Mobile number**, **Email**, **Best time to visit**,
**Anything we should know?**) and clicks **Book my free trial**, a new lead
appears in **CRM** (column **new**). See
[operations.md](operations.md#4-handle-crm-leads).

---

## Signing in and finding the editor

1. Sign in to the staff console (`/login`).
2. In the left menu, under **Website**, click **Content**, **Media** or
   **Blog**.

Each Website page has the same three tabs at the top (**Content**, **Media**,
**Blog**) and a **View on site** link that opens the public page in a new tab.

---

## Edit the website text (Content)

The page is called **Website content**. Each card is one part of the site.
Every save goes live immediately.

| Card | Where it appears | Fields |
|---|---|---|
| **Hero** | Top of the home page | **Hero image** (pick from the **hero** album, or **Auto** = first published hero photo), **Eyebrow** (small tag over the photo), **Headline**, **Subheadline**, **Primary CTA** and **Secondary CTA** (each: **Label** = button text, **Href** = where it goes, for example `/contact`) |
| **About** | "Why Queenix" on the home page | **Heading**, **Body**, **Highlights** (each: **Title**, **Body**) |
| **Testimonials** | Member quotes on the home page | **Items** (each: **Quote**, **Name**, **Detail**) |
| **Contact & hours** | Contact page, "Visit the club" on the home page, footer | **Address**, **Phone**, **WhatsApp**, **Email**, **Map URL**, **Hours** (each row: **Days**, **Time**) |
| **Social links** | Footer **Follow** | **Instagram**, **TikTok**, **Facebook** (full web addresses) |
| **App promo** | Dark band with **App Store** / **Google Play** buttons | **Heading**, **Body**, **iOS app URL**, **Android app URL** |
| **SEO** | Browser tab title and the text search engines show | **Title**, **Description** |

To change a section:

1. Edit the boxes in that card.
2. For lists, click **Add highlight** / **Add testimonial** / **Add hours row**
   to add one, or **Remove** on an item to delete it.
3. Click the card's save button (**Save hero**, **Save about**,
   **Save testimonials**, **Save contact & hours**, **Save social links**,
   **Save app promo**, **Save SEO**). The button is greyed out until you change
   something.
4. A message confirms the section is "saved — live on the website."
5. Changed your mind before saving? Click **Discard changes**.

Under each card's title you'll see "Last saved …" or, if nobody has edited it
yet, "Showing default copy."

Tips:

- Keep the **Headline** short (a few words).
- **Href** for pages on this site starts with `/` (`/contact`, `/schedule`,
  `/blog`). For other sites use the full address starting with `https://`.
  Link boxes (every **Href**, **URL** and social link) only accept a `/path`,
  a `#anchor`, `https://` (or `http://`), `mailto:` or `tel:` link; anything
  else is refused when you save.
- The **App Store** and **Google Play** links are placeholders (`#`) until the
  app is published. Put the real store links in **iOS app URL** and
  **Android app URL** when you have them.

---

## Manage photos (Media)

The page is called **Media library**. Only **published** photos appear on the
site.

### Upload a photo

1. Under **Upload image**, choose the **Image file (max 8 MB)**. Only JPEG,
   PNG, WebP, GIF and AVIF pictures are accepted (no SVG or other files).
2. Type the **Alt text (required)**: one sentence describing the photo
   (for example "Members in a reformer class"). It helps blind visitors and
   search engines.
3. Optional: a **Caption** (shown under the photo in the gallery).
4. Choose the **Album**:

   | Album | Used for |
   |---|---|
   | **gallery** | Gallery page, and the "Inside Queenix" strip on the home page |
   | **hero** | The big photo at the top of the home page |
   | **blog** | Blog cover images |
   | **general** | Anything else (still selectable as a blog cover) |

5. Click **Upload**. You'll see "Uploaded — it stays hidden from the site until
   you publish it."

### Publish, edit, reorder or delete

The **Library** shows every photo. Filter with **all**, **gallery**, **hero**,
**blog** or **general**. Each photo has a **Published** or **Hidden** badge.

| To… | Do this |
|---|---|
| Show it on the site | Tick **Published** |
| Hide it | Untick **Published** |
| Fix the description | Change **Alt text** or **Caption**, then click **Save details** |
| Move it to another album | Choose the album in the drop-down (saves at once: "Moved album.") |
| Change the order | Use the up and down arrows (**Move up** / **Move down**) |
| Delete it for good | Click **Delete** and confirm. This removes the file and can't be undone |

---

## Write the blog (Blog)

The page is called **Blog**. "Drafts stay private; published posts appear on
/blog."

### Find a post

Use **Status** (**All**, **Drafts**, **Published**). Each post shows its web
address (`/blog/…`), tags, the date it was published or last edited, and a
**draft** or **published** badge. Click a post to edit it.

### Write a new post

1. Click **New post**. Every new post starts as a **draft**: nothing is public
   until you publish.
2. Type the **Title**. The slug (the end of the web address, shown as
   "Slug (URL: /blog/…)") fills itself in from the title; you can change it.
3. Add **Tags (comma separated)**, for example `training, nutrition`.
4. Write a short **Excerpt** (shown on the blog list).
5. Pick a **Cover image** from the media library, or **None**.
6. Write the text in **Body (Markdown)**. The **Preview** beside it shows how it
   will look.
7. Click **Save draft** to keep working later, or **Publish** to put it live
   ("Published — live on the blog.").

### Change or remove a published post

- Edit, then click **Save changes**. Changes are live as soon as you save.
- **Unpublish** takes it off the site and back to draft.
- **View on site** opens the live post.
- **Delete post** removes it for good (you are asked to confirm).

### Writing the body (Markdown basics)

| Type this | To get |
|---|---|
| `## Heading` | A heading |
| `**bold**` | **bold** |
| `*italic*` | *italic* |
| `- item` (one per line) | A bullet list |
| `1. item` | A numbered list |
| `[link text](https://example.com)` | A link |
| A blank line | A new paragraph |

HTML code typed into the body is shown as plain text, not run.

---

## What you can't do here

| You want to… | Who can help |
|---|---|
| Change the class timetable | Your developer (no screen yet) |
| Change membership plans or prices on the website | Finance (**Members & plans** → **Plans**) |
| Change a trainer's photo, bio or specialties | The trainer, in their app (**Profile** → **Edit profile**) |
| Add new pages or change the menu | Your developer |
| Answer free-trial requests | Operations, in **CRM** |

---

## Troubleshooting

| Problem | What it means | What to do |
|---|---|---|
| Save button is greyed out | Nothing has changed in that card | Edit something first |
| "Only image files can be uploaded." | The file isn't a picture | Choose a JPEG, PNG, WebP, GIF or AVIF file |
| "JPEG, PNG, WebP, GIF or AVIF images only, up to 8 MB." | The file is another image type (for example SVG) or too large | Save it as JPEG or PNG under 8 MB and upload again |
| "… must be a /path, #anchor, https://, mailto: or tel: link" | A link box has an address the site won't accept | Start it with `/`, `#`, `https://`, `mailto:` or `tel:` |
| "That image is over 8 MB — please resize it first." | File too large | Make it smaller and try again |
| "Alt text is required…" | The alt text box is empty | Describe the photo |
| Photo doesn't appear on the site | It is **Hidden**, or in the wrong album | Tick **Published**; check the **Album** |
| Hero photo didn't change | **Hero image** is set to **Auto** | Pick the photo in the **Hero** card and click **Save hero** |
| Post not on the blog | It's still a **draft** | Open it and click **Publish** |
| **Staff only** on the Website pages | Your role isn't operations, admin or superadmin, and you haven't been given the "edit website" permission | Ask a superadmin |
| "Slug "…" is already used by another post" | Two posts can't share a web address | Change the slug and save again |
| "Slug may only use lowercase letters, numbers and dashes" | The slug has spaces or other characters | Use only `a-z`, `0-9` and `-` |
| "Title is required" (or another field "is required") | A required box is empty | Fill it in |
