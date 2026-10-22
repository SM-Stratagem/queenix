# Coffee guide

**Who this is for:** coffee shop staff (baristas, café counter).

**What this role is for:** running the coffee order queue (preparing, ready,
served), taking payment (cash at the counter or a card payment link), and
ringing up walk-up sales. You work in the **staff console**.

---

## Signing in and where you land

| Where | You land on |
|---|---|
| Staff console (`/login`, or **Staff login** on the website) | **Coffee management** |
| Queenix app | **Scanner** tab (limited, see [The app](#the-app)) |

## Tour of the staff console

Your left menu shows:

| Section | Menu item | Page title | What it's for |
|---|---|---|---|
| **Venues** | **Coffee** | **Coffee management** | Everything for the coffee shop |
| **Control** | **Settings** | **Settings** | The coffee shop's payment gateway and the branch list |

### The Coffee management page, top to bottom

| Section | What it shows |
|---|---|
| **Coffee shop — payment gateway** | How the coffee shop takes online payments ("Now: …"). See [Change the payment gateway](#4-change-the-payment-gateway) |
| Cards | **Revenue (non-cancelled)**, **Billable orders**, **Open queue**, **Inflow by status** |
| **Add menu item** | Name and price of a new item (managers only, see below) |
| **Menu** | The menu with **Deactivate** / **Activate** and **Remove** (managers only) |
| **Counter sale (walk-up, cash)** | Ring up a customer who pays cash at the counter |
| **Order queue** | All open orders |

---

## Daily tasks

### 1. Work the order queue

Each line in **Order queue** shows: customer name · items · total · status ·
payment mode.

Move each order along with the button next to it:

| Status | Button | Next status |
|---|---|---|
| **queued** | **Start preparing** | preparing |
| **preparing** | **Mark ready** | ready |
| **ready** | **Mark served** | served (leaves the queue) |

Click **Cancel** to cancel an order that is queued or preparing. (Ready orders
can't be cancelled; serve them.)

When the queue is empty it says *"Queue is empty — no open orders."*

### 2. Take payment

Each order shows either **Paid · cash** / **Paid · tap** / **Paid · stripe**,
or **Unpaid** with the amount.

Cash at the counter:

1. Take the money.
2. Click **Cash paid**. You'll see *"Marked cash paid."*

Card payment link (when the gateway is Tap or Stripe and
**Online payments on** is set):

1. Click **Payment link**. A link appears with a "Link created via …" message.
2. Click **Copy** and send it to the customer.
3. When they pay, the order shows **Paid**. **Refresh link** makes a new one.

> Card payments run in **test mode** for now: no real money moves through a
> payment link. Take cash or card at the counter for real payments.

### 3. Ring up a walk-up customer

1. Under **Counter sale (walk-up, cash)**, choose the item in **Pick item…**.
2. Type the **Qty**.
3. Click **Record cash sale**. You'll see *"Counter sale recorded (cash)."*
4. Take the cash. The order is already **Paid · cash** and appears in the queue
   as **queued**: prepare and serve it as usual.

Walk-up orders show **your** name as the customer name, because the customer
has no account.

### 4. Change the payment gateway

Do this only if your manager asks.

1. Under **Coffee shop — payment gateway**, choose **Cash only**,
   **Tap (UAE cards)** or **Stripe (international)**.
2. Set the currency (normally **AED**) and tick or untick
   **Online payments on**.
3. Click **Save gateway**. You'll see *"Gateway saved."*

The same setting is on **Settings** → **Venue payment gateways**.

---

## Members ordering from the app

The member app has a coffee screen ("Pay at the counter on pickup — cash and
cards accepted there."), but members have no button to reach it yet. Expect
most orders to be rung up at the counter for now.

---

## The app

The app opens on the **Scanner** tab ("Check-in scanner"). You can scan member
QR codes there (see [operations.md](operations.md#1-check-members-in)) and use
**Profile** → **Punch clock** to punch in and out.

The other tabs (**Classes**, **Members**, **Issues**) and **Start shift** on
Profile are for operations staff; for you they show an error or do nothing.
The app also has a **Coffee queue** screen, but there is no button to reach it
yet. Use the staff console for the queue.

---

## What you can't do

| You want to… | Who can help |
|---|---|
| Add, deactivate or remove a menu item (**Create item**, **Deactivate**, **Remove**) | Operations, finance or admin. The buttons show for you, but saving fails |
| See the salon or other console pages | Not part of the coffee role |
| Refund a card payment | Finance or admin |
| Change your role | Superadmin, admin or finance |

---

## Troubleshooting

| Problem | What it means | What to do |
|---|---|---|
| An error mentioning "Requires one of", or nothing happens, after **Create item**, **Deactivate** or **Remove** | Only managers can change the menu | Ask operations or finance |
| *"coffee is set to cash — switch its gateway to Tap or Stripe first"* | Payment links need an online gateway | Take cash, or ask a manager |
| *"Online payments are disabled for coffee"* | **Online payments on** is unticked | Take cash, or ask a manager |
| *"Already paid"* | Someone already marked it paid | Nothing to do |
| *"Pick an item and a positive quantity."* | Counter sale form incomplete | Pick an item and type a quantity |
| **Staff only** page | Not part of the coffee role | Click **Go to my home** |
| Sign-in problems, codes not arriving | See [README](README.md#common-problems-all-roles) | |
