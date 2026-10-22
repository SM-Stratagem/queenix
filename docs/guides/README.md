# Queenix Gym user guides

These guides explain how to use the Queenix Gym platform day to day. They are
written for gym staff and members, not for developers.

The platform has three parts:

| Part | Who uses it | Where |
|---|---|---|
| **Public website** | Anyone (future members) | The gym's web address: Home, Schedule, Gallery, Blog, Contact |
| **Staff console** | Staff only | The same web address, at `/login` (or click **Staff login** at the top of the website) |
| **Queenix app** | Members, and several staff roles | Phone app (iPhone and Android) |

Members use **only the phone app**. If a member signs in to the staff console,
they are signed straight back out with the message *"Member accounts work in
the mobile app"*.

---

## Which guide is mine?

Your **role** decides what you see. Ask a superadmin if you are not sure which
role you have.

| Role | Where you work | Where you land after signing in | Guide |
|---|---|---|---|
| Superadmin | Staff console (also a phone area) | Console: **Dashboard**. App: **Overview** tab | [superadmin.md](superadmin.md) |
| Admin | Staff console (also a phone area) | Console: **Dashboard**. App: **Overview** tab | [admin.md](admin.md) |
| Finance (formerly called "Owner") | Staff console (also a phone area) | Console: **Finance** page. App: **Overview** tab | [finance.md](finance.md) |
| Operations | Staff console and the app | Console: **Dashboard**. App: **Scanner** tab | [operations.md](operations.md) |
| Trainer | The app and the staff console | App: **Today** tab. Console: **Trainer** page | [trainer.md](trainer.md) |
| Salon | Staff console (the app is limited) | Console: **Salon management**. App: **Scanner** tab | [salon.md](salon.md) |
| Coffee | Staff console (the app is limited) | Console: **Coffee management**. App: **Scanner** tab | [coffee.md](coffee.md) |
| Member | The app only | App: **Home** tab | [member.md](member.md) |
| Website editor (operations, admin, superadmin) | Staff console, **Website** section | **Website content** page | [website-editor.md](website-editor.md) |

"Owner" is the old name for the Finance role. Anyone who still shows as
"owner" has exactly the same access as Finance.

Some people hold more than one role. In the app, you land on the home of your
**active role** (set by whoever gave you the roles), or the role you last
switched to on that phone. Member, finance and operations profiles have a
**Switch role** option (see your guide). In the console, you see every page
that any of your roles allows.

---

## How to sign in

### Staff console (web)

1. Open the gym's web address and click **Staff login** (top right), or go
   straight to `/login`.
2. Type your **Email** and **Password**.
3. Click **Sign in**.
4. You land on your start page (see the table above).

To sign out, click the **Sign out** button (the small arrow icon next to your
name, top right).

**Forgot your password?**

1. On the sign-in page, click **Forgot password?**
2. Check your email address and click **Email me a code**.
3. Open your email. The subject line reads "*123456* is your Queenix Gym code".
4. Type the 6-digit **Code** and a **New password** (at least 8 characters).
5. Click **Set new password**, then sign in with the new password.

Codes expire after 10 minutes. After 5 wrong tries you need a new code.

### Queenix app (phone)

The app has two ways to sign in, shown as two buttons at the top:
**Email** and **Phone**.

- **Email**: type **Email** and **Password**, then tap **Sign in**.
- **Phone**: type your **Phone number** with the country code (for example
  `+971501234567`), tap **Text me a code**, type the 6-digit **SMS code**, then
  tap **Verify & sign in**. This only works after you have added and verified
  your phone in the app (see [member.md](member.md#security-settings)).

New members tap **Sign up** to create an account. Staff accounts are created
the same way: the person signs up in the app, then a superadmin, admin or
finance user gives them a staff role (see below).

---

## Demo accounts (testing only)

These accounts exist only on test systems. The password for all of them is
`QueenixDemo123!`. On a test system the staff sign-in page shows them as
one-click buttons under **DEMO ACCOUNTS**. They are never shown on the live
system.

| Role | Email | Use it in |
|---|---|---|
| Superadmin | `superadmin@queenix.test` | Staff console |
| Finance | `owner@queenix.test` | Staff console |
| Operations | `ops@queenix.test` | Staff console and app |
| Trainer | `trainer@queenix.test` | App and staff console |
| Salon | `salon@queenix.test` | Staff console |
| Coffee | `coffee@queenix.test` | Staff console |
| Member | `member@queenix.test` | App only |

---

## Giving someone a role

Who can do this: **superadmin**, **admin** and **finance**. Operations can see
the screen but cannot save changes.

The person must already have an account. If they don't, ask them to sign up in
the Queenix app first.

1. In the staff console, open **Team & roles** (left menu, under **People**).
   The page is called **Team**.
2. Click the **Roles & permissions** tab.
3. In the **Staff** box, type their email in **Add by email** and click
   **Find**. (People who already have a staff role are listed below the box;
   you can click their name instead.)
4. Under **Granted roles**, tick every role they should have.
5. Under **Active role**, choose the role they should start in. It must be one
   of the ticked roles.
6. Click **Save roles**. You should see *"Roles saved."*
7. Optional: fill in **Title**, **Department** and the manager drop-down (it
   starts as **No manager**), then click **Save profile**. This places them in
   the **Org chart** tab.

The person gets an in-app notification: *"Your roles were updated"*. Their web
access can take up to 5 minutes to change. If a page still says
**Staff only**, ask them to sign out and sign in again.

To **remove** a role, untick it and click **Save roles**. Every person needs at
least one role; give them **member** if they should keep only their member
account.

### Giving one extra permission (without a new role)

The system can give a single person one extra permission, for example letting
a finance user edit the website (`content.manage`) or send phone push
(`notifications.push`). **There is no screen for this yet.** Ask your
developer to add the permission.

Be aware: an extra permission lets the person *save* that kind of change, but
the staff console still shows pages by role. For example, a finance user given
`content.manage` will still see **Staff only** on the **Website** pages. Today
the reliable way to give someone website access is the **operations** role.

---

## What is not finished yet

| Area | What that means for you |
|---|---|
| Card payments | Stripe and Tap run in **test mode**. No real money moves when a member pays by card in the app. Cash at the counter is real. |
| Phone push notifications | Only reach phones running the **production** build of the app. The test app (Expo Go) and simulators do not receive push. In-app notifications always work. |
| App Store / Google Play | The **App Store** and **Google Play** buttons on the website are placeholders until the app is published. |
| Arabic | The app shows "English · Arabic soon". Everything is in English for now. |

---

## Common problems (all roles)

| What you see | What it means | What to do |
|---|---|---|
| *"Invalid email or password"* | Wrong email or password | Check for typos, or use **Forgot password?** |
| *"Too many requests. Please try again later."* | More than 10 sign-in attempts in one minute from the same network (staff often share one office network) | Wait one minute and try again |
| *"Member accounts work in the mobile app"* | A member account tried the staff console | Use the Queenix app instead |
| **Staff only** box with **Go to my home** | That page is not part of your role | Click **Go to my home**, or ask a superadmin for access |
| *"Live data unavailable — you may not have access, or the backend is unreachable."* | The page opened, but your role cannot load its data, or the system is down | Ask a superadmin to check your role; if everyone sees it, the system is down |
| *"Your session has expired — sign in again to load live data."* | You were signed out in the background | Click **Sign in** |
| Verification or reset code didn't arrive | Email can be slow or filtered | Wait a minute, check your spam or junk folder, then ask for a new code. Codes last 10 minutes |
