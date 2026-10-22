# Admin guide

**Who this is for:** the general manager or anyone who runs the whole gym.

**What this role is for:** full access to every page and every action in the
staff console: members, staff and roles, front desk, money, venues, growth,
outreach, the website and reports. Admin and [superadmin](superadmin.md) see
the same screens today. You are also the person who works with the developer
to get the system ready for real use (see
[Going-live checklist](#going-live-checklist)).

---

## Signing in and where you land

| Where | You land on |
|---|---|
| Staff console (`/login`, or **Staff login** on the website) | **Dashboard** |
| Queenix app | **Overview** tab (Finance area, see [finance.md](finance.md#tour-of-the-app-finance-area)) |

---

## Tour of the staff console

Your left menu shows every section:

| Section | Menu items | Use it for | Step-by-step guide |
|---|---|---|---|
| **Overview** | **Dashboard** | A live picture of today | [below](#1-morning-check-dashboard) |
| **People** | **Members**, **Trainers**, **Trainer home**, **Team & roles**, **Approvals** | Members, plans, trainers, staff, roles, time off, requests | [finance.md](finance.md), [superadmin.md](superadmin.md), [operations.md](operations.md) |
| **Front desk** | **Classes**, **Branches**, **Events**, **Valet** | The floor | [operations.md](operations.md) |
| **Money** | **Finance** | Ledger, books, payouts, voids, daily close | [finance.md](finance.md) |
| **Venues** | **Coffee**, **Salon** | The café and salon | [coffee.md](coffee.md), [salon.md](salon.md) |
| **Growth** | **CRM**, **Promotions**, **Partners**, **Documents** | Leads, referrals, partner payouts, legal documents | [operations.md](operations.md), [finance.md](finance.md) |
| **Outreach** | **Notifications**, **Sales push** | Messages to members, phone push | [operations.md](operations.md#phone-notifications) |
| **Website** | **Content**, **Media**, **Blog** | The public website | [website-editor.md](website-editor.md) |
| **Control** | **Reports**, **Audit log**, **Settings** | Reports, audit trail, payment gateways | [finance.md](finance.md), [superadmin.md](superadmin.md#6-payment-gateways) |

The full page-by-page table (with every page title) is in
[superadmin.md](superadmin.md#tour-of-the-staff-console).

---

## Your daily routine

### 1. Morning check (Dashboard)

| Card | What to look at |
|---|---|
| **Active members**, **Today's revenue**, **Today's check-ins**, **Live occupancy** | Today's headline numbers |
| **Revenue — last 14 days** | Payments per day, plus coffee and salon sales for 14 days |
| **Total members** | Growth over 12 months, "+N this month" |
| **Live occupancy** | Who is in the gym now |
| **Classes happening now** | Live classes (**LIVE**), "Up next today", open incidents and staff on shift |
| **Recent check-ins** | The last entries and exits (denied ones are marked) |
| **Scanner health** | Each door scanner online/offline; **Refresh** |

### 2. Clear the queues

- **Approvals**: anything **Pending** (see
  [finance.md](finance.md#2-handle-a-trainers-early-payout-request)).
- **Team & roles** → **Timings & time off**: pending day-off requests.
- **CRM**: new website trial requests in the **new** column.

### 3. Weekly

- **Reports**: revenue, P&L and memberships expiring soon.
- **Audit log**: voids and payouts.
- **Trainers**: certifications marked **Expiring soon** or **Expired**.
- **Members & plans** → **Plans**: plans and prices are right.

### 4. Roles and staff

See [Giving someone a role](README.md#giving-someone-a-role) and
[superadmin.md](superadmin.md#2-set-up-a-new-staff-member-from-start-to-finish).

---

## Going-live checklist

Your developer does the technical work. Use this list to track it and to know
what to ask for. The details are in `DEPLOY.md` and `docs/` in the project.

| # | Item | Why it matters | Where it's described |
|---|---|---|---|
| 1 | Production servers and secret keys generated and stored safely | The system won't start without them | `DEPLOY.md` sections 2, 4 or 5 |
| 2 | Email sending set up (SMTP), with your domain verified | Sign-up and password-reset codes. Without domain checks, codes land in spam | `DEPLOY.md` section 3 |
| 3 | SMS sending set up (Twilio, with a registered UAE sender ID) | Phone sign-in codes | `DEPLOY.md` section 3 |
| 4 | Card payments: real Stripe and/or Tap keys | Today everything runs in test mode; no real card money moves | `DEPLOY.md` section 2, `docs/PAYMENTS.md` |
| 5 | The first superadmin account | Someone must be able to hand out roles. The developer sets this with the protected role-assignment tool | `DEPLOY.md` section 2 (`QUEENIX_ADMIN_TOKEN`) |
| 6 | Mobile app built and published (EAS build, App Store, Google Play) | Members need the app. Phone push only works in this build | `DEPLOY.md` section 6 |
| 7 | Real App Store / Google Play links | The website buttons are placeholders until then. Put the links in **Website** → **Content** → **App promo** | [website-editor.md](website-editor.md) |
| 8 | Door QR scanner and fingerprint reader installed and connected | Automatic check-in and staff punch-in | `docs/SCANNER_SETUP.md`, `DEPLOY.md` section 7 |
| 9 | Daily backups switched on | Recovery after a failure | `DEPLOY.md` section 7 |
| 10 | Demo accounts and demo data **not** loaded on the live system | Demo logins use a shared password | `DEPLOY.md` section 7 |
| 11 | Website text, photos and blog replaced with your own | The site ships with placeholder copy and stock photos | [website-editor.md](website-editor.md) |
| 12 | Membership plans, coffee menu and salon services entered | Members and counters need real prices | [finance.md](finance.md#10-manage-membership-plans), [coffee.md](coffee.md), [salon.md](salon.md) |
| 13 | Coffee and salon payment gateways chosen | Payment links need Tap or Stripe | [superadmin.md](superadmin.md#6-payment-gateways) |
| 14 | Legal review of waivers and e-signatures | Members sign documents in the app | `HANDOFF.md` (launch checklist) |

---

## What you can't do (yet)

| You want to… | What to do |
|---|---|
| Give one person a single extra permission | No screen yet; ask your developer |
| Delete a user | Not possible; remove their staff roles |
| Create classes on the timetable | No screen yet; ask your developer |
| Refund a successful card payment | In Stripe or Tap (test mode for now) |
| Filter the Dashboard by branch | The **Branch** selector only labels the view today |

---

## Troubleshooting

| Problem | What it means | What to do |
|---|---|---|
| **Scanner health** shows a scanner offline | The door scanner hasn't reported in | Power-cycle it; staff can use the app camera |
| **Scanner health** says "No scanners registered…" | No door scanner connected yet | See item 8 of the checklist |
| A card checkout fails in the app | No real payment keys yet, or a provider error | Take payment at the counter; see checklist item 4 |
| Members say codes don't arrive | Email/SMS not set up or landing in spam | Checklist items 2 and 3 |
| Staff say a page shows *"Live data unavailable…"* | Their role can't load that page's data | Check their role (some menu items load only for certain roles; see each role's guide) |
| Sign-in problems | See [README](README.md#common-problems-all-roles) | |
