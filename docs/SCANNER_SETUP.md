# Queenix Gym — Physical QR Scanner Setup

This guide covers the physical QR scanner hardware installed at the
gym entrance. The scanner reads each member's rotating QR code, POSTs
it to a webhook, and gets a decision back (`open_door_2s` or
`beep_twice`). It is the primary check-in path; the in-app camera
scanner on the staff iPad is the backup / manual mode.

---

## Architecture

```
[ Member phone ]                  [ Member phone ]
        │ QR code                      │ QR code
        ▼                              ▼
┌───────────────────────┐     ┌──────────────────────────┐
│ Hardware scanner      │     │ Operations app (iPad)    │
│ (ZKTeco / Hikvision /  │     │  • react-native-vision-  │
│  generic TCP barcode)  │     │    camera QR fallback    │
└──────────┬────────────┘     └──────────┬───────────────┘
           │ HTTPS POST                  │ Convex mutation
           │ /api/scanner/qr             │ processAccessScan
           ▼                              ▼
┌──────────────────────────────────────────────────────────────┐
│ Next.js admin  (apps/web)                                    │
│  /api/scanner/qr       — webhook entry point                 │
│  /api/scanner/health   — heartbeat, returns bridge status    │
│  /api/scanner/register — admin installs a new device         │
└──────────┬───────────────────────────────────────────────────┘
           │ Convex deploy key (server-to-server)
           ▼
┌──────────────────────────────────────────────────────────────┐
│ Convex                                                       │
│  mutations/access:processAccessScan                          │
│  mutations/operations:recordScannerHeartbeat                 │
│  queries/access:getScannerHealth                             │
└──────────────────────────────────────────────────────────────┘
```

The **camera scanner** in the operations app calls Convex directly
with the user's Convex auth token. The **hardware scanner** is
unauthenticated and goes through the Next.js bridge so we can validate
the device, log it, and rate-limit it.

---

## Recommended hardware (Dubai-procured)

These are the models we have tested and recommend. All ship with
HTTP/HTTPS POST webhook support, so they integrate with the bridge
out of the box.

| Model | Vendor | Price (AED) | Where to buy | Notes |
|------:|--------|------------:|--------------|-------|
| **ZKTeco QR500** | ZKTeco | 1,250 | Emax, Jumbo, Amazon.ae | Wall-mount, IP65, 0.3s read time. Our default. |
| **Hikvision DS-K1T320MWX** | Hikvision | 1,580 | Alack, Souq.com | 2.4" LCD, prints "Welcome" on screen, can drive a relay. |
| **Sy creader QR-200** | Sy creader | 690 | Dubai Cameras LLC (Deira) | USB barcode reader, cheap, needs a Raspberry Pi to bridge. |
| **Honeywell Vuquest 3320g** | Honeywell | 1,150 | Mideast Data Systems, Karama | Industrial-grade, 2D, IP54. Best for outdoor entrance. |
| **Unitech HT730** | Unitech | 2,200 | Barcode Gulf (JLT) | Handheld + cradle. Use for mobile staff scanning. |
| **TAYVE T-5070** (tablet) | Tayve | 1,400 | Amazon.ae | 7" Android tablet, runs the operations app directly. Use instead of separate hardware. |

> **Recommendation for the front door:** Buy **two** ZKTeco QR500s
> (one for IN, one for OUT) plus a **Hikvision DS-K1T320MWX** as the
> VIP entrance, and a **Tayve T-5070** tablet running the operations
> app as the receptionist's manual scan tool. Total: ~5,200 AED.

### Dubai-based vendors

| Vendor | Address | Phone | Notes |
|--------|---------|-------|-------|
| **Emax** | Mall of the Emirates, Dubai | 800-36297 | ZKTeco authorised reseller, warranty honoured in-store. |
| **Jumbo Electronics** | Multiple, incl. Dubai Mall | 800-58667 | Carries Hikvision, Honeywell. |
| **Alack IT Distribution** | Al Quoz | +971-4-321-2020 | Hikvision, ZKTeco wholesale. |
| **Dubai Cameras LLC** | Deira, Al Ras | +971-4-226-7776 | Generic QR/barcode scanners, repair, programming. |
| **Mideast Data Systems** | Karama | +971-4-396-6661 | Honeywell industrial. |
| **Barcode Gulf FZ-LLC** | JLT, Cluster I | +971-4-450-8840 | Unitech, CipherLab. |

> All vendors accept P.O. and can deliver same-day in Dubai for
> stock items. Order 1× spare of each to keep on the shelf.

### Hardware procurement checklist

- [ ] 2× ZKTeco QR500 (front entrance, IN + OUT)
- [ ] 1× Hikvision DS-K1T320MWX (VIP entrance) — *optional*
- [ ] 1× Tayve T-5070 tablet (receptionist's manual scan)
- [ ] 2× 5V/2A USB power adapters + 3m cables
- [ ] 1× CAT6 ethernet cable per fixed scanner (10m)
- [ ] 1× PoE switch (8-port, if running >2 wired scanners)
- [ ] 1× UPS (APC 600VA) — keeps the bridge alive during power blips
- [ ] Mounting kit (ZKTeco ships with wall bracket; buy extra for ceiling)
- [ ] Spare QR test cards (3× laminated A6 with sample tokens)
- [ ] Label printer + weatherproof labels for `deviceId` on each scanner
- [ ] Vendor warranty cards filed in /admin/scanners/warranty

---

## Network setup

The scanner must be able to reach the web admin's public URL over
HTTPS. There are three acceptable configurations.

### Option A — Public URL (preferred)

Most common. The scanner's webhook target is a public URL like
`https://admin.queenix.ae/api/scanner/qr`.

1. In your DNS, point `admin.queenix.ae` at the Next.js deployment
   (Vercel, Cloudflare Pages, or your own VPS).
2. Ensure the deployment is on a public, HTTPS-only origin.
3. Set the env vars on the deployment:
   ```
   CONVEX_SITE_URL=https://your-deployment.convex.cloud
   CONVEX_DEPLOY_KEY=prod:xxxxxxxxxxxxxxxx
   ALLOWED_SCANNER_DEVICES=front-door,back-door,vip-entrance
   PUBLIC_WEB_URL=https://admin.queenix.ae
   ```
4. In the scanner firmware, set the webhook URL to
   `https://admin.queenix.ae/api/scanner/qr` (HTTP POST, JSON body).

### Option B — Same LAN as the gym

If the admin URL is internal (`http://192.168.1.10:3000`), the
scanner must be on the same VLAN. The Next.js deployment must listen
on `0.0.0.0` (it does by default in `next dev`).

1. Static IP for the admin server: 192.168.1.10.
2. DHCP reservation for each scanner (e.g. 192.168.1.42 for
   `front-door`).
3. Configure the scanner webhook:
   `http://192.168.1.10:3000/api/scanner/qr`.
4. **Important:** Allow scanner → admin on TCP 3000 in the firewall.

### Option C — Cloudflare Tunnel

If your gym does not have a public IP and the admin lives on-prem,
install a Cloudflare Tunnel on the admin server. The scanner then
calls the tunnel URL.

1. `cloudflared tunnel login`
2. `cloudflared tunnel create queenix-admin`
3. `cloudflared tunnel route dns queenix-admin admin.queenix.ae`
4. `cloudflared tunnel run queenix-admin`
5. Scanner webhook: `https://admin.queenix.ae/api/scanner/qr`

---

## Configuration per scanner model

### ZKTeco QR500

1. Plug in, wait for the green LED.
2. Press the **M/OK** button for 3 seconds — enters admin mode.
3. Menu → **Communication** → **Cloud Server**.
4. Set **Mode** = `HTTP POST`.
5. Set **URL** = `https://admin.queenix.ae/api/scanner/qr`.
6. Set **Content-Type** = `application/json`.
7. Set **Body template** =
   `{"token":"%ID","deviceId":"front-door","direction":"in","timestamp":%TS}`
   (the scanner substitutes `%ID` with the read QR string and `%TS`
   with the Unix millisecond timestamp).
8. Save and reboot.
9. Scan a test card — you should see `Welcome` on the LCD and hear
   the relay click for 2 seconds.

### Hikvision DS-K1T320MWX

1. Open the iVMS-4200 client on a laptop on the same network.
2. Find the device → **Remote Configuration** → **Network** →
   **HTTP Listen**.
3. Set **Mode** = `POST`.
4. **URL** = `https://admin.queenix.ae/api/scanner/qr`.
5. **Header**: `Content-Type: application/json`.
6. **Event Type** = `Person Verify`.
7. The body Hikvision sends is a complex XML/JSON; map it to our
   schema with an iVMS transform. If the device firmware cannot
   reshape the body, install a Cloudflare Worker in front that
   accepts the Hikvision body and forwards to `/api/scanner/qr`.
8. Save and reboot.

### Generic TCP barcode scanner (e.g. Sy creader USB)

A USB barcode reader cannot make HTTP calls on its own. Two options:

**A) Use a Raspberry Pi bridge.**

```bash
# On the Raspberry Pi (Raspberry Pi OS Lite, headless)
sudo apt install nodejs npm
sudo npm i -g node-pcap http-proxy-agent

cat > /home/pi/scanner-bridge.js <<'JS'
const http = require('http');
const { exec } = require('child_process');
const SERIAL = '/dev/ttyUSB0';
let buf = '';
require('fs').watchFile(SERIAL, () => {});
require('child_process').spawn('stty', ['-F', SERIAL, '115200', 'raw', '-echo']);
const stream = require('fs').createReadStream(SERIAL);
stream.on('data', (chunk) => {
  buf += chunk.toString();
  if (buf.includes('\n')) {
    const token = buf.trim();
    buf = '';
    if (!token) return;
    const body = JSON.stringify({ token, deviceId: 'front-door', direction: 'in' });
    const req = http.request({
      host: 'admin.queenix.ae',
      port: 443,
      path: '/api/scanner/qr',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });
    req.write(body);
    req.end();
  }
});
JS

sudo systemctl enable --now scanner-bridge
```

**B) Use a Tayve T-5070 tablet running the operations app** — the
in-app camera scanner fills the same role and needs no separate
bridge.

### Honeywell / Unitech / CipherLab handhelds

These ship with **EZConfig** or similar. In the web admin, set the
**Server URL** to
`https://admin.queenix.ae/api/scanner/qr?token=%SCAN_DATA%&deviceId=mobile&direction=in`
and the **HTTP method** to `GET`. The bridge accepts both POST and
GET so handhelds can use whichever they prefer.

---

## Sample webhook payload

### Outgoing (scanner → bridge)

```json
{
  "token":     "k7v2n4q8-1757411200000-a1b2c3d4",
  "deviceId":  "front-door",
  "direction": "in",
  "timestamp": 1757411200421
}
```

### Response (bridge → scanner)

```json
{
  "granted": true,
  "reason":  null,
  "user": {
    "_id":      "j97a1f4hwz8b3k2d1x6y5t9r0p",
    "fullName": "Aisha Al-Mansoori",
    "avatarUrl":"https://cdn.queenix.ae/avatars/aisha.jpg"
  },
  "action":  "open_door_2s",
  "display": "✓ Welcome Aisha"
}
```

For denied scans:

```json
{
  "granted": false,
  "reason":  "Membership expired",
  "user":    null,
  "action":  "beep_twice",
  "display": "✗ Membership expired"
}
```

---

## Registering a new device

1. Add the device ID to the `ALLOWED_SCANNER_DEVICES` env var
   (comma-separated), e.g. `front-door,back-door,vip-entrance`.
2. Hit the registration endpoint once to provision it:

   ```bash
   curl -X POST https://admin.queenix.ae/api/scanner/register \
     -H 'Content-Type: application/json' \
     -d '{
       "deviceId":  "vip-entrance",
       "name":      "VIP entrance",
       "location":  "Lobby, west side",
       "model":     "ZKTeco QR500",
       "ipAddress": "192.168.1.43"
     }'
   ```

   Response includes `apiKey` and the webhook URL to configure into
   the firmware.

3. Power-cycle the scanner. Within 60 seconds the operations
   dashboard should flip from "Offline" to "Online".

---

## Troubleshooting

### Scanner shows "Server error" / 502

- Check the `CONVEX_DEPLOY_KEY` is set on the Next.js deployment
  and is a **production** key (starts with `prod:`), not a dev key.
- Check the Next.js deployment logs — the bridge logs Convex errors
  verbatim. Most common: `FORBIDDEN` (deploy key revoked) or
  `CONVEX_SITE_URL` typo.
- Verify Convex is up: `curl
  https://your-deployment.convex.cloud/api/health` should return
  `{"ok":true}`.

### Scanner shows "Unregistered device" / 403

- Add the device ID to `ALLOWED_SCANNER_DEVICES`.
- Restart the Next.js deployment so it picks up the new env var.
- The device ID must match **exactly** (case-sensitive, no spaces).
  Many firmwares prepend a model code (e.g. `ZKT-QR500-ABC123`); use
  the `deviceId` field of the payload, not the serial number.

### Scanner reads the QR but nothing happens

- The QR may have expired — the rotating QR rotates every 60s.
  Check the member app is online and the screen is not dimmed.
- Test with a **known-good** QR: open the member's profile on your
  own phone, screenshot the QR, and scan the screenshot. If the
  screenshot works but the live screen doesn't, the screen is
  dimming too fast.
- Test directly:
  `curl -X POST https://admin.queenix.ae/api/scanner/qr \
   -H 'Content-Type: application/json' \
   -d '{"token":"PASTE_A_TOKEN_HERE","deviceId":"front-door","direction":"in"}'`
  Should return a 200 JSON with `granted: true/false`.

### Bridge is online but operations dashboard shows "Offline"

- The dashboard reads `lastSeenAt` from the `scannerDevices` table.
  The scanner must POST to `/api/scanner/health` periodically (every
  30-60 seconds). Check the firmware's "heartbeat" or "keep-alive"
  setting and point it at the health URL.
- Some firmware only POSTs on a scan. If that's the case, trigger
  a manual scan to refresh the heartbeat.

### Door relay doesn't fire even when `granted: true`

- The bridge returns `action: "open_door_2s"`, but the relay is
  driven by the scanner firmware, not the bridge. Check the
  scanner's relay configuration: most ZKTecos have a "Wiegand /
  Relay output" menu — set it to "close for 2s on 200 OK".
- For Hikvision, the relay is in **Access Control** → **Relay
  Output** → set duration to 2s and trigger on the person-verify
  event.

### Token rotation mismatch

- The QR rotates every 60 seconds (see `rotateAccessToken` in
  `packages/convex/convex/mutations/access.ts`). If a member's
  phone time is more than 30s off, the token will be rejected.
- The bridge checks `tokenExpiresAt` server-side, so do **not**
  trust the client clock.
- Fix: tell members to enable "Set automatically" in their phone's
  date/time settings. In the UAE, most telcos (Etisalat, du) auto-set
  the time when the SIM is active.

### DNS / firewall

- The scanner only needs outbound HTTPS on port 443. It does **not**
  need inbound. So no NAT, no port forwarding.
- If you use a corporate firewall (Palo Alto, FortiGate), allow
  `*.convex.cloud` and `*.queenix.ae` on 443.
- For the LAN-only setup, allow `192.168.1.42 → 192.168.1.10:3000`
  on TCP.

### Token rotation mismatches during DST / Ramadan

The token is signed by an absolute Unix millisecond timestamp, not a
local time. DST changes (and Ramadan offset) are handled
automatically. The only time the bridge will reject tokens is when
the **server clock** drifts — Convex and Vercel are both NTP-synced,
so this should never happen. If you ever self-host, configure
`chrony` against `time.cloudflare.com`.

---

## Security notes

- The bridge endpoints do **not** require the scanner to send an
  auth token — they validate the **device ID** against the
  allow-list. This is intentional: most QR scanner firmware cannot
  store or sign secrets, and the device ID is rotated every time
  you reinstall a unit.
- The `apiKey` returned by `/api/scanner/register` is **stored in
  Convex for audit only**. If a future firmware supports per-device
  auth headers, the bridge will accept `X-Device-Key: <apiKey>` and
  reject mismatches.
- All scan events are logged to `accessEvents` regardless of
  outcome. The bridge never silently fails.
- The hardware scanner never sees member PII — it only sees the
  rotating token. PII (`fullName`, `avatarUrl`) flows back to the
  scanner, but only to the local LCD/buzzer, not over the network.

---

## What to monitor

- **Online status** (the operations dashboard banner). Should be
  green 24/7.
- **Average scan latency** (Next.js logs). Should be <300ms p95.
- **Denied rate**. >10% denied means a misconfiguration — usually
  a wrong `direction` field.
- **Last seen at**. If older than 5 min, the scanner is offline —
  call the gym and ask the front desk to power-cycle.

---

_Last updated: 2026-09-09 — Queenix Gym, Dubai._
