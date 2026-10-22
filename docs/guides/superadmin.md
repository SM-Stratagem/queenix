# Superadmin guide

**Who this is for:** the one or two people who own the whole system.

**What this role is for:** full access to every page and every action in the
staff console, and responsibility for who has which role. A superadmin and an
[admin](admin.md) see the same pages. The difference: only a superadmin can
make someone an **admin** or a **superadmin**, and only a superadmin can
change the roles of an admin. Keep the number of superadmins small.

---

## Signing in and where you land

| Where | You land on |
|---|---|
| Staff console (`/login`, or **Staff login** on the website) | **Dashboard** |
| Queenix app | **Overview** tab (the Finance area of the app, see [finance.md](finance.md#tour-of-the-app-finance-area)) |

---

## Tour of the staff console

You see every section of the left menu. The right-hand column says which guide
explains each page step by step.

| Section | Menu item | Page title | What it's for | Details in |
|---|---|---|---|---|
| **Overview** | **Dashboard** | **Dashboard** | Today's KPIs (**Active members**, **Today's revenue**, **Today's check-ins**, **Live occupancy**), **Revenue — last 14 days**, **Total members**, **Live occupancy**, **Classes happening now**, **Recent check-ins**, **Scanner health** | [admin.md](admin.md#1-morning-check-dashboard) |
| **People** | **Members** | **Members & plans** | **Directory** and **Plans** (membership catalogue) | [finance.md](finance.md#10-manage-membership-plans) |
| **People** | **Trainers** | **Trainers** | Every trainer: clients, PT sessions, classes, certifications, **Inflows** | [below](#4-look-at-trainers) |
| **People** | **Trainer home** | **Trainer** | A trainer's own page (useful to check what trainers see) | [trainer.md](trainer.md) |
| **People** | **Team & roles** | **Team** | **Org chart**, **Timings & time off**, **Roles & permissions** | [README](README.md#giving-someone-a-role) |
| **People** | **Approvals** | **Approvals** | Requests from members and staff (you can't decide your own) | [finance.md](finance.md#2-handle-a-trainers-early-payout-request) |
| **Front desk** | **Classes** | **Classes overview** | Today's roster, upcoming classes | [operations.md](operations.md#2-run-the-classes) |
| **Front desk** | **Branches** | **Branches** | Create and edit branches, assign staff | [below](#5-branches) |
| **Front desk** | **Events** | **Events** | Workshops and challenges | [operations.md](operations.md#9-events) |
| **Front desk** | **Valet** | **Valet queue** | Car check-in and hand-over | [operations.md](operations.md#3-valet) |
| **Money** | **Finance** | **Finance** | Ledger, books, payouts, voids, daily close | [finance.md](finance.md) |
| **Venues** | **Coffee** | **Coffee management** | Menu, queue, gateway | [coffee.md](coffee.md) |
| **Venues** | **Salon** | **Salon management** | Services, queue, gateway | [salon.md](salon.md) |
| **Growth** | **CRM** | **CRM** | Leads and follow-ups | [operations.md](operations.md#4-handle-crm-leads) |
| **Growth** | **Promotions** | **Promotions** | Referral numbers (**Referral codes**, **Pending**, **Converted**, **Expired**, **Reward points granted**), **Recent referrals**, **Promo outreach** | (view only) |
| **Growth** | **Partners** | **Partners** | Payouts to trainers and partners | [finance.md](finance.md#1-record-a-payout-trainer-or-partner) |
| **Growth** | **Documents** | **Legal documents** | Templates, signatures, paper forms | [finance.md](finance.md#14-signed-forms-and-documents) |
| **Outreach** | **Notifications** | **Notifications** | Messages to members, with phone push | [operations.md](operations.md#phone-notifications) |
| **Outreach** | **Sales push** | **Sales push** | Promo messages (in-app) | [operations.md](operations.md#6-send-a-sales-promo) |
| **Website** | **Content**, **Media**, **Blog** | **Website content**, **Media library**, **Blog** | The public website | [website-editor.md](website-editor.md) |
| **Control** | **Reports** | **Reports** | Revenue analytics, P&L, retention | [finance.md](finance.md#8-run-reports) |
| **Control** | **Audit log** | **Audit log** | Every finance and payment action | [finance.md](finance.md#9-check-the-audit-log) |
| **Control** | **Settings** | **Settings** | Coffee and salon gateways, branch list, shortcuts (**Team & roles →**, **Approvals →**, **Audit log →**, **Branches →**) | [below](#6-payment-gateways) |

At the top of every page: the **Branch** selector (**All branches** plus one
entry per active branch). Picking a branch filters the **Events** page. The
Dashboard numbers stay gym-wide: memberships, payments and check-ins aren't
recorded per branch yet.

On a phone, the left menu becomes a top bar: tap the menu button (three
lines) to open it.

---

## Your main jobs

### 1. Give, change or remove roles

Follow [Giving someone a role](README.md#giving-someone-a-role).

As superadmin you can give any role, including **admin** and **superadmin**,
and change anyone's roles except your own. To change your own roles, ask
another superadmin.

Which role to give:

| Person | Role(s) |
|---|---|
| Owner / general manager | **admin** (or **superadmin** for the system owner) |
| Accountant, finance manager | **finance** |
| Front desk, operations manager, website editor | **operations** |
| Personal trainer / coach | **trainer** (add **member** if they also train at the gym) |
| Salon staff | **salon** |
| Café staff | **coffee** |
| Customer | **member** (everyone who signs up gets this automatically) |

> **Be careful with admin and superadmin.** Admin and finance can change the
> roles of people ranked below them, but only you can create admins and
> superadmins, and nobody can change their own roles. Role changes are written
> to the audit log.

### 2. Set up a new staff member from start to finish

1. Ask them to install the Queenix app and **Sign up** with their work email.
2. **Team & roles** → **Roles & permissions** → **Add by email** → **Find**.
3. Tick their roles, choose the **Active role** (this decides which area their
   app opens), click **Save roles**.
4. Fill **Title**, **Department** and the manager, click **Save profile**.
5. **Branches** → click the branch → **Select staff…**, **Role at branch**,
   **Primary** → **Assign**.
6. Trainers: ask them to complete their app **Profile** (bio, rate,
   specialties, certifications). They then appear on **Trainers** and on the
   public website.
7. Ask them to sign out and back in if a page still says **Staff only**
   (access normally updates within a minute).

### 3. When someone leaves

1. **Team & roles** → **Roles & permissions** → click their name.
2. Untick every staff role, leave **member** ticked (or only member), set
   **Active role** to **member**, click **Save roles**.
3. **Branches** → their branch → **Remove**.

There is no "delete user" button. Accounts are kept for the records.

### 4. Look at trainers

**Trainers** shows each trainer as a card (**internal** or **external**,
**available** or **unavailable**, clients, PT sessions, upcoming classes).

- Filter with **Search trainers…**, **Any availability** / **Available** /
  **Unavailable**, and **Internal + external** / **Internal** / **External**.
  **Export CSV** downloads the list.
- Click a trainer to see their rate and rating,
  **Certifications & documents** (each marked **Valid**, **Expiring soon**,
  **Expired** or **No expiry**), **Inflows** (total, pending, paid),
  **Clients** and **Upcoming classes**.

A trainer counts as **internal** once they have a staff profile (saved under
**Roles & permissions** → **Save profile**).

### 5. Branches

1. **Branches** → **+ New branch** → **Name**, **City**, **Address**,
   **Phone** → **Save**.
2. Click a branch to **Edit** it, **Deactivate** / **Activate** it, and manage
   its staff.

### 6. Payment gateways

**Settings** → **Venue payment gateways**: for **coffee** and **salon**,
choose **cash**, **tap** or **stripe**, the currency (**AED**, **USD**,
**SAR**) and **Enabled**, then **Save gateway**. The actual card keys are set
by your developer, never on this page. Card payments and payment links don't
work until real keys are added.

### 7. Keep an eye on things

- **Dashboard** every morning.
- **Approvals** for anything waiting. Refund and payout requests need a
  finance-level decision (you have it); nobody can decide their own request.
- **Audit log** for unusual payment, payout or void actions.
- **Team & roles** → **Timings & time off** for pending day-off requests
  (also in the app: **Approvals** → **Time off**).

---

## The app

Your app opens on the Finance area (**Overview**, **Ops**, **Members**,
**Approvals**, **Profile**). See
[finance.md](finance.md#tour-of-the-app-finance-area). The **Approvals** tab
also has a **Time off** filter for staff day-off requests. If you also hold other
roles, use **Profile** → **Switch role**.

---

## What you can't do (yet)

| You want to… | What to do |
|---|---|
| Give one person a single extra permission | No screen yet; ask your developer ([README](README.md#giving-one-extra-permission-without-a-new-role)) |
| Change your own roles | Not allowed; another superadmin must do it |
| Delete a user | Not possible; remove their staff roles instead |
| Create or edit classes on the timetable | No screen yet; ask your developer |
| Refund a successful card payment | In Stripe or Tap |
| Create the very first superadmin on a new system | A developer task (see [admin.md](admin.md#going-live-checklist)) |

---

## Troubleshooting

| Problem | What it means | What to do |
|---|---|---|
| *"No account for … — they need to sign up first."* | The email has no account | Ask them to sign up in the app |
| "Active role must be one of the granted roles" | The **Active role** isn't ticked | Tick it, or choose another active role |
| "At least one role is required" | Every role was unticked | Leave at least **member** |
| *"You cannot change your own roles."* | You opened your own name | Ask another superadmin |
| *"Roles saved, but web access did not update — save again."* | The save reached the database but not the sign-in system | Click **Save roles** again |
| Person still sees **Staff only** after getting a role | Their browser remembers old access for up to a minute | Ask them to sign out and in |
| *"Live data unavailable…"* on a page | The data couldn't load | Refresh; if it persists, tell your developer |
| Sign-in problems, codes not arriving | See [README](README.md#common-problems-all-roles) | |
