# Salon guide

**Who this is for:** salon staff (stylists, therapists, salon reception).

**What this role is for:** running the salon booking queue: confirming and
completing appointments, taking payment (cash at the till or a card payment
link), and booking walk-in customers. You work in the **staff console**.

---

## Signing in and where you land

| Where | You land on |
|---|---|
| Staff console (`/login`, or **Staff login** on the website) | **Salon management** |
| Queenix app | **Scanner** tab (limited, see [The app](#the-app)) |

## Tour of the staff console

Your left menu shows:

| Section | Menu item | Page title | What it's for |
|---|---|---|---|
| **Venues** | **Salon** | **Salon management** | Everything for the salon |
| **Control** | **Settings** | **Settings** | The salon's payment gateway and the branch list |

### The Salon management page, top to bottom

| Section | What it shows |
|---|---|
| **Salon — payment gateway** | How the salon takes online payments ("Now: …"). See [Change the payment gateway](#4-change-the-payment-gateway) |
| Cards | **Revenue (non-cancelled)**, **Billable bookings**, **Open queue**, **Inflow by status** |
| **Services** | The service list. You can see it but not change it (no **Add service**, **Deactivate** or **Remove** for you; see [What you can't do](#what-you-cant-do)) |
| **Walk-in booking (counter, cash)** | Book a customer who walks in and pays cash |
| **Booking queue** | All pending and confirmed bookings |

---

## Daily tasks

### 1. Work the booking queue

Each line in **Booking queue** shows: customer name · service · date and time ·
status · payment mode.

Bookings only move forward: pending → confirmed → completed. You can cancel
a booking while it is pending or confirmed.

1. A new booking is **pending**. Click **Confirm** once you accept it.
2. When the service is done, click **Complete**. The booking leaves the queue.
3. If the customer cancels or doesn't come, click **Cancel**.

If a step isn't allowed, the reason appears in red above the queue, for
example *"Cannot move a cancelled booking to completed"* (someone else cancelled it first).

When the queue is empty it says *"Queue is empty — no pending or confirmed
bookings."*

### 2. Take payment

On each booking, the payment part shows either **Paid · cash** /
**Paid · tap** / **Paid · stripe**, or **Unpaid** with the amount.

Cash at the till:

1. Take the money.
2. Click **Cash paid**. You'll see *"Marked cash paid."* and the badge turns to
   **Paid · cash**.

Card payment link (when the gateway is Tap or Stripe and
**Online payments on** is set):

1. Click **Payment link**. A link appears with a "Link created via …" message.
2. Click **Copy** and send the link to the customer (WhatsApp, SMS, email).
3. When they pay, the booking shows **Paid**. Click **Refresh link** if the
   customer needs a fresh one.

> Payment links only work with **Tap** once your developer has added the real
> keys. Until then you'll see *"Payment gateway not configured"*. With
> **Stripe** you'll see *"Stripe payment links are not available yet — use Tap
> or cash"*. Take cash or card at the till instead.

### 3. Book a walk-in customer

1. Under **Walk-in booking (counter, cash)**, choose the service in
   **Pick service…** (shows price and minutes).
2. Pick the date and time.
3. Click **Book & take cash**. You'll see *"Walk-in booked (cash)."*
4. Take the cash. The booking is already marked **Paid · cash** and appears in
   the queue as **pending**: **Confirm** and **Complete** it as usual.

Walk-in bookings show **Walk-in** as the customer name, because the customer
has no account. Write the customer's name down if you need it.

### 4. Change the payment gateway

Do this only if your manager asks.

1. On **Salon management**, under **Salon — payment gateway**, choose
   **Cash only**, **Tap (UAE cards)** or **Stripe (international)**.
2. Set the currency (normally **AED**) and tick or untick
   **Online payments on**.
3. Click **Save gateway**. You'll see *"Gateway saved."*

The same setting is on **Settings** → **Venue payment gateways** (choices
**cash**, **tap**, **stripe**; currency **AED**, **USD**, **SAR**; **Enabled**;
**Save gateway**). Card secret keys are never typed here; your developer sets
them.

---

## Members booking from the app

The member app has a salon screen ("Pay at the salon — cash and cards
accepted at the till."), but members have no button to reach it yet. Expect
most bookings to be made at the counter for now.

---

## The app

The app opens on the **Scanner** tab ("Check-in scanner"). You can scan member
QR codes there (see [operations.md](operations.md#1-check-members-in)) and use
**Profile** → **Punch clock** to punch in and out.

The other tabs (**Classes**, **Members**, **Issues**) and **Start shift** on
Profile are for operations staff; for you they show an error or do nothing.
The app also has a **Salon queue** screen, but there is no button to reach it
yet. Use the staff console for the salon queue.

---

## What you can't do

| You want to… | Who can help |
|---|---|
| Add, deactivate or remove a service | Operations, finance or admin. These buttons don't show for salon staff |
| Move a booking back a step (for example completed → confirmed) | Not possible; bookings only move forward |
| See the coffee shop or other console pages | Not part of the salon role |
| Refund a card payment | Finance or admin |
| Change your role | Superadmin, admin or finance |

---

## Troubleshooting

| Problem | What it means | What to do |
|---|---|---|
| *"Cannot move a … booking to …"* | Bookings only move forward | Use the button shown for the booking's current status |
| *"salon is set to cash — switch its gateway to Tap or Stripe first"* | Payment links need an online gateway | Take cash, or ask a manager to change the gateway |
| *"Payment gateway not configured"* | No real card keys are set up yet | Take cash; tell your manager |
| *"Stripe payment links are not available yet — use Tap or cash"* | Links work only with Tap | Take cash, or ask a manager to switch the gateway to Tap |
| *"Online payments are disabled for salon"* | **Online payments on** is unticked | Take cash, or ask a manager |
| *"Order is already paid"* / *"Already paid"* | Someone already marked it paid | Nothing to do |
| *"Pick a service, date and time."* | Walk-in form incomplete | Fill all three |
| **Staff only** page | Not part of the salon role | Click **Go to my home** |
| Sign-in problems, codes not arriving | See [README](README.md#common-problems-all-roles) | |
