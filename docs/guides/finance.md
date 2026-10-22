# Finance guide

**Who this is for:** the finance team. "Owner" is the old name of this role;
anyone shown as "owner" has exactly the same access.

**What this role is for:** the money side of the gym: payments, the books
(profit & loss and journal), payouts to trainers and partners, voiding bad
payments, reports, the audit log, membership plans, and approving requests.
You also look after the coffee shop and salon money, and can manage staff
roles.

---

## Signing in and where you land

| Where | You land on |
|---|---|
| Staff console (`/login`, or **Staff login** on the website) | **Finance** page |
| Queenix app | **Overview** tab |

---

## Tour of the staff console

### Your left menu

Your menu is kept short on purpose. It shows only:

| Section | Menu item | Page title | What it's for |
|---|---|---|---|
| **Money** | **Finance** | **Finance** | Ledger, books, payouts, refunds, daily close, audit trail |
| **Venues** | **Coffee** | **Coffee management** | Coffee menu, sales, order queue, gateway |
| **Venues** | **Salon** | **Salon management** | Salon services, sales, booking queue, gateway |
| **Growth** | **CRM** | **CRM** | Sales leads and follow-up tasks |
| **Growth** | **Promotions** | **Promotions** | Referral funnel and promo messages sent |
| **Growth** | **Partners** | **Partners** | Payouts to trainers and partners |
| **Growth** | **Documents** | **Legal documents** | Agreement and waiver templates, signatures, paper forms |

### Pages you can open from links or by typing the address

The menu hides these, but your role can open them. Use the links on the
Finance page, or type the address after the gym's web address (for example
`…/approvals`).

| Address | Page | What it's for |
|---|---|---|
| `/reports` | **Reports** (link **Reports center →** on Finance) | Revenue analytics, profit & loss, retention |
| `/audit` | **Audit log** (link **Audit log →** on Finance) | Every payment, payout, invoice and finance action |
| `/approvals` | **Approvals** | Requests waiting for a finance decision, including trainers' early payouts |
| `/members` | **Members & plans** | Member directory and the **Plans** catalogue |
| `/dashboard` | **Dashboard** | Today's KPIs, revenue chart, occupancy, classes, check-ins |
| `/team` | **Team** | Org chart, time off, roles (see [README](README.md#giving-someone-a-role)) |
| `/trainers` | **Trainers** | Trainer list with clients, classes and inflows |
| `/branches`, `/events`, `/valet`, `/classes` | | Front-desk pages; see [operations.md](operations.md) |
| `/notifications`, `/sales-push` | | Send in-app messages to members; see [operations.md](operations.md#phone-notifications). Finance cannot send phone push |
| `/settings` | **Settings** | Coffee and salon payment gateways |

You cannot open the **Website** pages or the **Trainer home** page.

---

## The Finance page, top to bottom

| Section | What you see and can do |
|---|---|
| Links | **Reports center →**, **Audit log →** |
| Overview cards | **Gross collected**, **Refunded**, **Net revenue**, **Successful payments**, **Refunds issued**, **Payouts issued** |
| **Books — profit & loss** | Pick a **Month:**. Shows **Income** and **Expenses**, then rows: Membership & system revenue, Manual income, Refunds, Payouts, Manual expenses, and **Net profit** |
| **Record a book entry** | Add off-system income or expenses (cash sales, bills, petty cash). **Scan receipt** fills the form from a photo |
| **Import books from CSV** | Upload many entries at once |
| **Journal** | All manual entries: Date, Type, Category, Note, Receipt, Amount. **Export CSV** |
| **Filters** | **Status:** and **Type:** for the transaction list |
| **Transactions** | Every payment. **Export CSV**. **Void** on pending or failed payments |
| **Daily close** | Pick a day to see gross, refunded, net, counts and payouts for that day |
| **Payouts** | Payouts list (**Mark paid**, **Cancel**) and the form to record a new one |
| **Refunds** | Refunds processed by the payment provider |
| **Audit trail** | The latest finance actions |

---

## Daily tasks

### 1. Record a payout (trainer or partner)

1. On **Finance**, scroll to **Payouts**.
2. Type the **Recipient name** and **Amount (AED)**.
3. Choose the method: **Bank transfer**, **Cash** or **Wallet**.
4. Click **Record payout**. You'll see *"Payout recorded as pending."*
5. When the money has actually been sent, click **Mark paid** on that payout.
   You'll see *"Payout marked as paid."* Click **Cancel** instead if it should
   not be paid.

Payouts also show on the **Partners** page, where you can filter **all**,
**pending**, **paid** or **cancelled**.

### 2. Handle a trainer's early payout request

Trainers can tap **Request early payout** in their app. The request lands in
**Approvals**.

1. Open `/approvals`.
2. Keep **Pending** selected and click the **Payout** filter.
3. Read the request (name, amount, note).
4. Optional: type a **Decision note (optional)**.
5. Click **Approve** or **Deny**. The trainer gets an in-app notification.
6. If approved, record the actual payout (task 1) and **Mark paid** when sent.

The other filters are **All**, **Membership**, **Payment**, **Document**,
**Trainer** and **Access**. **Approved**, **Denied** and **Cancelled** show
past decisions.

### 3. Record an expense or extra income (journal)

1. On **Finance**, go to **Record a book entry**.
2. Optional: click **Scan receipt** and take or choose a photo. The form fills
   in for you. Check every field. If the receipt isn't in AED, convert the
   amount first. **Detach receipt** removes the photo.
3. Choose **Expense** or **Income**.
4. Type or pick a **Category** (for example Payroll, Rent, Utilities, Supplies,
   Marketing, Maintenance; or Membership dues, PT packages, Events, Café,
   Salon).
5. Type the **Amount (AED)**, set the date, and add a **Note (optional)**.
6. Click **Record entry**. The entry appears in **Journal** and in the month's
   profit & loss.

### 4. Import many entries from a spreadsheet

1. Export the **Journal** once (**Export CSV**) to see the right column layout:
   date, kind (income/expense), category, amount, note.
2. Fill your spreadsheet in the same layout and save it as CSV.
3. Under **Import books from CSV**, choose the file.
4. Check the preview table. Each row says **valid** or what is wrong.
5. Click the **Import … valid rows** button (it shows the number of good
   rows). Fix bad rows in the file and upload again.

### 5. Read the profit & loss (P&L)

- Monthly: on **Finance**, **Books — profit & loss** → pick the **Month:**.
- Rolling: on **Reports**, **Profit & loss** → **Last 30 days**,
  **Last 90 days** or **Last 12 months**. **Export CSV** downloads it.

### 6. Void a payment

Use this for a payment that is **pending** or **failed** and should never be
collected (for example a duplicate checkout). Successful payments can't be
voided; they must be refunded.

1. On **Finance**, use **Filters** → **Status:** `pending` or `failed` to find
   it.
2. Click **Void** on that row.
3. A box asks for the reason ("Reason (required)"). Type it and confirm.
4. A message confirms "Payment voided" with the member's name. The action is
   written to the audit log.

**Refunds:** there is no refund button in the console. Refunds are made in the
payment provider (Stripe or Tap) and then appear under **Refunds**
automatically. While payments run in test mode, no real refunds happen.

### 7. Close the day

1. On **Finance**, go to **Daily close** and pick the date.
2. Read gross, refunded, net, number of successful and refunded payments, and
   payouts for that day.
3. Compare with the counter cash (coffee and salon "cash paid" orders).

### 8. Run reports

Open **Reports** (link **Reports center →** on Finance).

| Section | Options | Export |
|---|---|---|
| **Revenue analytics** | **Range:** **3 mo**, **6 mo**, **12 mo**. Per month: gross, refunded, net, number of payments | **Export CSV** |
| **Profit & loss** | **Last 30 days**, **Last 90 days**, **Last 12 months** | **Export CSV** |
| **Retention projections** | Active memberships, trials, auto-renew; memberships expiring in 30/60/90 days and their projected value | |

Other exports: **Members & plans** directory, **Trainers**, **CRM** leads,
**Journal**, **Transactions**, **Audit log**: each has an **Export CSV**
button.

### 9. Check the audit log

1. Open **Audit log** (link **Audit log →** on Finance).
2. Filter with **Action:** (**all**, **payment.**, **payout.**, **invoice.**,
   **finance.**), **Entity type (e.g. payment)** and **Entity ID**.
3. Each entry shows what happened, to what, when, and the before/after values.
4. **Export CSV** downloads the list.

### 10. Manage membership plans

1. Open `/members`. The page is **Members & plans**. Finance also sees the
   summary cards (**Members**, **Active membership**, **Trial**, **Frozen**,
   **No membership**).
2. Click **Plans**.
3. To add a plan, fill **Name**, **Description**, **Price (AED)**,
   **Duration (days)**, **Classes/mo**, **PT sessions**, then click
   **Create plan**.
4. To hide or show a plan in the app, click **Deactivate** or **Activate** on
   its card.

### 11. Freeze, unfreeze or cancel a member's plan

1. On **Members & plans** → **Directory**, search by name, email or phone and
   click **Open**.
2. Under **Memberships**, for an active plan: type the number of days and an
   optional reason, then click **Freeze**. Click **Cancel** to cancel the plan
   (you are asked to confirm).
3. For a frozen plan, click **Unfreeze**.

The member page also shows **Lifetime value**, **Open CRM tasks**,
**Recent payments**, **Recent visits**, **ID document** (with **Scan ID**),
**Documents** and **Profile**.

### 12. Coffee and salon money

On **Coffee management** and **Salon management**:

- Cards: **Revenue (non-cancelled)**, **Billable orders** /
  **Billable bookings**, **Open queue**, **Inflow by status**.
- The payment gateway card (**Coffee shop — payment gateway** /
  **Salon — payment gateway**): choose **Cash only**, **Tap (UAE cards)** or
  **Stripe (international)**, the currency, and **Online payments on**, then
  **Save gateway**. Card secrets are never typed here.
- In the queue, an unpaid order shows "Unpaid" with the amount, plus
  **Payment link** and **Cash paid**. See [coffee.md](coffee.md) and
  [salon.md](salon.md) for the full queue steps.

The same gateway choices are on **Settings** under
**Venue payment gateways**.

### 13. Signed forms and documents

**Documents** → **Legal documents** lists each template with its version,
whether it's required, and how many people signed. Click **Signatures** to see
who signed and when (with **paper copy** links).

To attach a paper form a member signed at the desk:

1. Under **Upload signed form**, find the member in
   **Find member (name/email)** and choose them in **Pick a member**.
2. Choose the document in **Pick the document**.
3. Click **Scan signed form** and take or pick a photo.
4. Check the text read from the photo, then click **Confirm & attach**.

---

## Tour of the app (Finance area)

| Tab | What it shows |
|---|---|
| **Overview** | **Today** / **Week** / **Month** buttons, KPI cards (**Active members**, **Today's revenue**, **Today's check-ins**, **Current occupancy**), **Revenue this week** chart, **Quick actions** (**Approvals**, **Announce**, **Reports**), **Alerts**, **View full operations** |
| **Ops** | Live headcount, staff on shift, and **Access**, **Classes**, **Staff**, **Incidents** views |
| **Members** | Member directory with search (**Search by name, email or phone**) and filters (**All**, **Active**, **Trial**, **Frozen**, **Cancelled**, **Expired**). Tap a member to open their record |
| **Approvals** | Pending requests with **Approve** / **Decline**, filters **All**, **Membership**, **Payments**, **Documents**, **Trainers**, **Access**, **Payouts** |
| **Profile** | **Switch role** (if you have several), **Gym info**, **Pricing & plans**, **Staff management**, **Announcements**, **Reports & exports**, **Approvals inbox**, venue payment status, **Help & support**, **Sign out** |

Things to know about the app area:

- The **Today** / **Week** / **Month** buttons and the **Revenue this week**
  chart are placeholders; use the console for real figures.
- The **Announce** and **Reports** quick actions open **Profile**.
  **Pricing & plans** and **Reports & exports** open **Overview**. Use the
  console for plans and reports.
- **Open door remotely** on the **Ops** tab and the door list under **Access**
  are not connected to real doors yet.
- **Gym info** may show blank branch details and can fail to save; edit
  branches in the console (**Branches**).

**Freeze a member's plan in the app:** **Members** → tap the member →
**Freeze** → set **Days** and **Reason (optional)** → **Confirm freeze**.
**Unfreeze** reverses it. **WhatsApp** opens a chat with the member.

**Send an announcement from the app:** **Profile** → **Announcements** →
type a title and the message → choose **Members** or
**Everyone incl. staff** → **Send announcement**. This goes to the in-app
inbox only (no phone push).

**Contact support from the app:** **Profile** → **Help & support** →
**Contact Concierge**: **Subject**, **Details**, a category (general, billing,
access, staff) → **Send request**.

---

## What you can't do

| You want to… | Who can help |
|---|---|
| Refund a successful payment | Done in Stripe/Tap by someone with provider access (test mode for now) |
| Send phone push notifications | Operations, admin or superadmin |
| Edit the public website | Operations, admin or superadmin (see [website-editor.md](website-editor.md)) |
| Give someone a single extra permission | Ask your developer (no screen yet) |

---

## Troubleshooting

| Problem | What it means | What to do |
|---|---|---|
| A page you need isn't in your menu | The finance menu shows only Money, Venues and Growth | Type the address (see the table above) |
| **Void** button missing | Only pending and failed payments can be voided | Refund it in the payment provider instead |
| *"A void reason is required."* | The reason box was empty | Void again and type a reason |
| *"Enter a recipient and a positive AED amount."* | Payout form incomplete | Fill both fields |
| *"Pick a category for the journal entry."* / *"Enter a positive amount for the journal entry."* | Book entry incomplete | Fill the category and amount |
| CSV import shows red rows | Those rows have a problem (shown in the Status column) | Fix them in the file and upload again |
| "Receipt is in … — convert the amount to AED before recording." | The scanned receipt isn't in AED | Convert, then record |
| **Staff only** on the Website pages | Not part of the finance role | Ask operations |
| Sign-in problems, codes not arriving | See [README](README.md#common-problems-all-roles) | |
