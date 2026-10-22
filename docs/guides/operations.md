# Operations guide

**Who this is for:** front desk and operations staff.

**What this role is for:** running the floor day to day. You check members in,
manage classes, valet, events and staff time off, follow up sales leads (CRM),
keep the coffee shop and salon queues moving, send notifications (including
phone push), and edit the public website. You work in both the staff console
and the Queenix app.

---

## Contents

1. [Signing in and where you land](#signing-in-and-where-you-land)
2. [Tour of the staff console](#tour-of-the-staff-console)
3. [Tour of the app](#tour-of-the-app)
4. [Daily tasks](#daily-tasks)
5. [Phone notifications](#phone-notifications)
6. [What you can't do](#what-you-cant-do)
7. [Troubleshooting](#troubleshooting)

---

## Signing in and where you land

| Where | You land on |
|---|---|
| Staff console (`/login`, or **Staff login** on the website) | **Dashboard** |
| Queenix app | **Scanner** tab |

---

## Tour of the staff console

| Section | Menu item | Page title | What it's for |
|---|---|---|---|
| **Overview** | **Dashboard** | **Dashboard** | Today's KPIs, member growth, live occupancy, classes now, recent check-ins, **Scanner health** |
| **People** | **Members** | **Members & plans** | Member directory and member records |
| **People** | **Trainers** | **Trainers** | Trainers with clients, PT sessions, upcoming classes, certifications |
| **People** | **Team & roles** | **Team** | **Org chart**, **Timings & time off**, **Roles & permissions** (view only for you) |
| **People** | **Approvals** | **Approvals** | Requests from members and staff |
| **Front desk** | **Classes** | **Classes overview** | **Today's roster** and **Upcoming classes** |
| **Front desk** | **Branches** | **Branches** | Branch list and staff assignments |
| **Front desk** | **Events** | **Events** | Workshops, challenges and other events |
| **Front desk** | **Valet** | **Valet queue** | Car check-in and hand-over |
| **Venues** | **Coffee** | **Coffee management** | Menu, sales, order queue |
| **Venues** | **Salon** | **Salon management** | Services, sales, booking queue |
| **Growth** | **CRM** | **CRM** | Sales leads, including free-trial requests from the website |
| **Outreach** | **Notifications** | **Notifications** | Messages to all members, optionally to their phones |
| **Outreach** | **Sales push** | **Sales push** | Promotional messages to members |
| **Website** | **Content**, **Media**, **Blog** | **Website content**, **Media library**, **Blog** | Edit the public website (see [website-editor.md](website-editor.md)) |
| **Control** | **Settings** | **Settings** | Coffee and salon payment gateways, branch list |

At the top of every page: the **Branch** selector (**All branches**,
**Main Branch — Queenix Gym**, and one entry per department). It only labels the
Dashboard; figures are not filtered by branch yet.

## Tour of the app

| Tab | Screen title | What it's for |
|---|---|---|
| **Scanner** | **Check-in scanner** | Scan member QR codes at the entrance |
| **Classes** | **Class rosters** | Today's classes and who is booked |
| **Members** | **Member support** | Support tickets from members; log a new ticket |
| **Issues** | **Incident reports** | Equipment, safety and other incidents |
| **Profile** | **Profile** | Your shift, **Punch clock**, **Switch role**, sign out |

---

## Daily tasks

### 1. Check members in

With the app (front desk phone or tablet):

1. Open the **Scanner** tab.
2. Read the banner:
   - "Hardware scanner: Online": the door scanner is working; the camera is
     the backup.
   - "Hardware scanner: Offline": use the camera. The door scanner needs a
     power-cycle.
   - "Hardware scanner: Unknown": waiting for the door scanner to report in.
3. Choose **IN** or **OUT** (members arriving or leaving).
4. Ask the member to open the **Gym** tab in their app and hold the QR code
   inside the frame. The first time, allow camera access.
5. The result appears at once:
   - Granted: "Welcome" and the member's first name.
   - Denied: the reason, such as "Token expired" (ask the member to tap
     **Refresh** in their app) or "Invalid token".
6. The **Last result** card shows the last scan. **Reset** clears it.
7. **Recent check-ins** lists the latest scans, and the **Live occupancy** bar
   shows how full the gym is.

> Not working yet: the "Manual token entry" box can't be typed into, and
> **Open main door** only shows a message; it does not open a door.

In the console, the **Dashboard** shows **Live occupancy**,
**Recent check-ins** (Member, Direction, Access point, Time) and
**Scanner health** (each door scanner, online or offline, with **Refresh**).

### 2. Run the classes

Console: **Classes** → **Classes overview**

- **Today's roster**: each class with time, trainer, "booked/capacity" and the
  names booked. **Export CSV** downloads it, handy for a paper sign-in sheet.
- **Upcoming classes**: the next classes with category, level, length and
  trainer.

App: **Classes** tab → **Class rosters**

- The row of days at the top shows the week, but the list always shows
  **today's** classes.
- Each class card has **Start check-in** and **View full roster**; both open
  the roster sheet with **Checked in**, **Pending** and **Capacity**.
- Members check in by scanning at the entrance (task 1). The roster sheet does
  not record attendance itself yet.

To create or change classes on the timetable, ask your developer; there is no
screen for this yet.

### 3. Valet

Console: **Valet** → **Valet queue**

To check in a car that arrives without a booking:

1. Under **Check in a car**, click **Scan plate** and photograph the plate, or
   type it in **Plate**.
2. If the plate is saved on a member's profile, that member is picked for you
   ("plate match"). Otherwise search **Find member (name/email)** and choose
   them in **Pick a member**.
3. Click **Check in**. A message confirms "Checked in" with the plate.

To work the queue:

- The **Active cars** card shows how many cars are reserved and checked in.
- Use the buttons **all**, **reserved**, **checked_in**, **completed**,
  **cancelled** to filter.
- Click **Check in** on a reserved car when you take the keys.
- Click **Complete** on a checked-in car when you hand the car back.

Members can save their plates in the app (**Profile** →
**Vehicles & parking**), which makes plate matching work.

### 4. Handle CRM leads

Open **CRM**. New free-trial requests from the website arrive automatically in
the **new** column, with the note "Free trial request from the website." and
the person's preferred time and message.

Add a lead by hand: type **Lead name** and **Phone**, click **Add lead**.

Move a lead through the pipeline: columns are **new**, **contacted**,
**trial**, **converted** and **lost**. On a lead card, click the arrow button
for the next stage (for example "→ contacted").

Work on one lead: click the lead card. **Lead detail** shows its history.

1. Contact them: edit the ready-made message, then click **WhatsApp** or
   **Email**. This opens WhatsApp or your email app.
2. Record what happened: type in **Log a note / call…** and click **Log**.
3. Fix details: click **Edit**, change **Name**, **Phone**, **Email**,
   **Source** or **Notes**, click **Save**.
4. When they join: click **Convert to member**, search for their new account
   (they must sign up in the app first), and click **Link**. The lead moves to
   **converted** and links to their member record.

Follow-up tasks: type in **New task…** and click **Add** (it is attached to the
selected lead, if any). Click **Done** when finished.

**Export CSV** (top right) downloads all leads.

### 5. Send a notification and phone push

See [Phone notifications](#phone-notifications) below.

### 6. Send a sales promo

1. Open **Sales push**.
2. Fill **Promo title**, **Promo details**, and optionally
   **CTA (e.g. Claim offer)** and **Price (optional)**.
3. Click **Push promo to members**. A message confirms how many members it was
   sent to.

Promos appear as promotion messages in every member's in-app
**Notifications**. They are not sent to phones as push. **Recent promos**
lists what was sent.

### 7. Look up a member

1. Open **Members**. The page shows the member directory.
2. Search **Search name, email, phone…** and/or filter by status: **all**,
   **active**, **trial**, **frozen**, **pending**, **expired**, **cancelled**.
3. Click **Open** to see the member record: **Memberships**,
   **Recent payments**, **Recent visits**, **ID document**, **Documents** and
   **Profile** (date of birth, emergency contact, vehicles).

To verify a member's ID at the desk:

1. On the member record, under **ID document**, choose **Emirates ID** or
   **Passport**.
2. Click **Scan ID** and photograph the card.
3. Check the fields (number, **Full name**, **Nationality**,
   **Date of birth**, **Expiry date**, **Sex**) and correct them.
4. Click **Confirm & save ID**. It now shows "Verified by staff".

To attach a paper form the member signed: on the member record under
**Documents**, use **Upload signed form**: **Pick the document**, click
**Scan signed form**, check the text, then **Confirm & attach**.

> The **Freeze** and **Cancel** buttons on a membership are visible to you but
> only finance and admin can use them. Ask finance.

### 8. Staff time off and sick days

Open **Team & roles** → **Timings & time off**.

- "Pending requests" lists day-off requests from trainers and staff. Click
  **Approve** or **Deny**.
- **Record sick day / leave**: choose **Select staff…**, a date, **Sick** or
  **Leave**, an optional **Note (optional)**, then click **Record**.
- The table shows each person's **Status** (**On shift** / **Off shift**),
  **Recent shifts** and **Sick / leave**. **Export CSV** downloads it.

The **Org chart** tab shows who reports to whom (**Search staff…**). The
**Roles & permissions** tab is view-only for operations.

### 9. Events

1. Open **Events** and click **+ New event**.
2. Fill **Title**, choose the branch (or **Gym-wide (all branches)**), and
   optionally **Capacity (optional)**.
3. Set **Starts** and **Ends**, add a **Description (optional)**.
4. Click **Save**.

Filter with the branch drop-down (**All branches + gym-wide** or one branch)
and **Upcoming only**. On a scheduled event, click **Edit** to change it or
**Cancel** to cancel it.

### 10. Branches and staff assignments

Open **Branches** and click a branch.

- The "Staff" list shows who works there. To add someone, choose
  **Select staff…**, type a **Role at branch**, tick **Primary** if it's their
  main branch, and click **Assign**. **Remove** takes them off.
- **Events at this branch** lists its upcoming events.

Creating a branch (**+ New branch**), **Edit** and **Deactivate** are finance
and admin jobs; the buttons show for you but saving will fail.

### 11. Approvals

**Approvals** lists requests (freeze, refund, document, trainer, access,
payout). You can **Approve** or **Deny** with an optional
**Decision note (optional)**. Leave **Payment** and **Payout** requests to
finance.

### 12. Coffee and salon queues

You can run both queues and manage both menus. See [coffee.md](coffee.md) and
[salon.md](salon.md). On **Settings**, you can change both venues' payment
gateway.

### 13. Member support tickets (app)

**Members** tab → **Member support**:

- The **Support queue** lists open and in-progress tickets (newest first) with
  open and critical counts.
- **New ticket**: leave the **Member** search empty ("leave blank for
  walk-in"), choose a **Category** (billing, access, class, general) and
  **Priority** (low, medium, high, critical), fill **Subject** and **Details**,
  then tap **Log ticket**.

> The member search on this tab shows **sample names only**, not real members,
> and picking one makes the ticket fail. Leave the member blank and write the
> member's name in **Details**.

### 14. Incidents (app)

**Issues** tab → **Incident reports**:

- **Open by severity**: **Critical**, **High**, **Medium**, **Low**.
- Filter **open**, **resolved**, **all**.
- Tap an incident to see **Description**, **Location**, **Reported by** and
  **Reported**, then tap **Mark resolved** when it's fixed.

> Not working yet: **Report incident** does not open a form, and **Escalate**
> does nothing. Until it's fixed, log a ticket on the **Members** tab with the
> details, or tell your manager.

### 15. Your shift and punch clock (app)

**Profile** tab:

- **Current shift**: tap **Start shift** when you begin and **End shift** when
  you finish. **Shift history** lists past shifts.
- **Punch clock** (under **Settings**): opens the **Punch clock** screen. Tap
  **Punch in** or **Punch out**. It shows **Current status**, hours **Today**
  and **This week**, and **Recent punches**. You can also punch with the
  front-desk fingerprint reader.
- **Switch role**: if you hold several roles, pick which area to open. If you
  land on a blank or "not found" screen afterwards, close and reopen the app.

Not working yet: **Handover notes** says "saved" but isn't stored, and the
**Documents** row does nothing. Your name and email on this screen are real,
but the phone number and "Employee since" shown are placeholders.

---

## Phone notifications

You can send a message to every member's in-app **Notifications** inbox, and
optionally to their phones as a push alert.

Who can send phone push: operations, admin and superadmin. Finance can send
in-app messages but doesn't see the phone option.

### Send a notification

1. In the console, open **Outreach** → **Notifications**.
2. The line at the top shows the audience, for example
   "Audience: 28 members (35 users total)".
3. Under **Compose broadcast**, type a **Title** and the **Message body**.
4. Choose a type: **system**, **class_reminder**, **membership**, **booking**
   or **reward**.
5. To also alert phones, tick **Also send to phones**.
6. Click **Send to members**.
7. You'll see "Sent to N members. Phone push queued for N members. Batch …".

**Recent sends** lists past broadcasts.

### Good to know

- Every member gets the in-app message, whether or not they have the app open.
- Phone push reaches only members who:
  - use the **production** build of the app (not the test app or a simulator),
  - allowed notifications when the app asked, and
  - have signed in on that phone.
- Tapping the alert opens the member's **Notifications** screen.
- A message goes to at most 500 members per send. If the result mentions
  "audience larger than one batch", tell your developer.
- Members can't reply. For two-way contact, use CRM (**WhatsApp** / **Email**)
  or support tickets.

### Write good notifications

- Keep the **Title** short (it's what shows on the lock screen).
- Put the date and time in the body for anything time-bound.
- Don't use push for promotions; use **Sales push** (in-app only).

---

## What you can't do

| You want to… | Who can help |
|---|---|
| Freeze, cancel or refund a membership | Finance or admin |
| Give or change staff roles | Superadmin, admin or finance ([README](README.md#giving-someone-a-role)) |
| Create, edit or deactivate a branch | Finance or admin |
| See revenue charts, the Finance page, Reports or the Audit log | Finance or admin |
| Create classes on the timetable | Your developer (no screen yet) |
| Change membership plans | Finance (**Members & plans** → **Plans**) |

---

## Troubleshooting

| Problem | What it means | What to do |
|---|---|---|
| "Hardware scanner: Offline" | The door scanner hasn't reported in for 2 minutes | Power-cycle it; use the camera meanwhile |
| Camera shows "Grant camera permission to enable scanning" | The app can't use the camera | Allow camera access in the phone's settings |
| Scan says "Token expired" | The member's code is older than 60 seconds | Ask them to tap **Refresh** in their app |
| An error mentioning "Requires one of" after clicking a button | Your role can't do that action (for example **Freeze** or **Save roles**) | Ask finance or admin |
| *"No account for … — they need to sign up first."* | That email has no account | Ask the person to sign up in the app |
| **Staff only** page | Not part of the operations role (for example **Finance**) | Click **Go to my home** |
| New ticket fails after picking a member | The member search uses sample names | Leave the member blank |
| Push sent but a member didn't get it on their phone | They are on a test build, refused notifications, or haven't signed in on that phone | The message is still in their in-app **Notifications** |
| Sign-in problems, codes not arriving | See [README](README.md#common-problems-all-roles) | |
