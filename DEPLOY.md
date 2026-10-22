# Deploying Queenix Gym

Everything here runs as containers. Test the exact production build locally
first (`./scripts/prod-local.sh`), then deploy the same images to Railway or AWS.

## Architecture

| Service | What it is | Image / build | Public? |
|---|---|---|---|
| `web` | Next.js staff console + all server APIs (auth, OTP, payments webhooks, scanner bridge, OCR proxy) | `apps/web/Dockerfile` | yes (your app domain) |
| `convex` | Self-hosted Convex backend (live data + file storage) | `ghcr.io/get-convex/convex-backend:849a6fc6…` (pinned) | yes (API domain — the apps talk to it directly) |
| `convex-deploy` | One-shot job: pushes Convex functions + their env on every release | `deploy/convex/Dockerfile` | no |
| `ocr` | OCR microservice (PaddleOCR models via RapidOCR): IDs, passports, plates, receipts, forms | `services/ocr/Dockerfile` | no (web calls it privately) |
| `auth-postgres` | Auth database (users, sessions, OTP codes) | managed Postgres | no |
| `convex-postgres` | Convex storage | managed Postgres | no |
| volume `/convex/data` | Convex file storage (scans, receipts, uploads) | volume (or S3 — see below) | — |

The mobile app is built with EAS (`apps/mobile/eas.json`) and talks to `web` (auth) and `convex` (data).

## 1. Test the production build locally

```bash
./scripts/prod-local.sh --demo     # builds prod images, generates secrets, seeds demo data
```

- Web: `http://<LAN-IP>:4000/login` (production Next.js server, `NODE_ENV=production`)
- Inbox: `http://localhost:8026` — stands in for your email provider **and** SMS provider
- Stop: `docker compose -f docker-compose.prod.yml --env-file .env.prod.local down`

The production server refuses to boot with missing or weak secrets and prints
the full list — that's intended.

## 2. Secrets

Generate once, store in the platform's secret manager, never commit:

```bash
node scripts/gen-secrets.mjs          # AUTH_SECRET, AUTH_JWKS, QUEENIX_ADMIN_TOKEN, SCANNER_API_KEY, OCR_API_KEY
openssl rand -hex 32                  # CONVEX INSTANCE_SECRET
```

`CONVEX_DEPLOY_KEY` (= Convex admin key) is derived from the instance name +
secret: after the Convex service is up, run `./generate_admin_key.sh` inside it
(Railway: `railway ssh --service convex`, then `./generate_admin_key.sh`).

### Web (`web`) environment

| Variable | Required | Notes |
|---|---|---|
| `AUTH_BASE_URL` | ✓ | `https://app.yourdomain.com` (https ⇒ secure cookies) |
| `AUTH_SECRET` | ✓ | ≥ 32 chars |
| `AUTH_JWKS` | ✓ | RS256 key JSON from gen-secrets (stable across deploys/instances) |
| `DATABASE_URL` | ✓ | auth Postgres URL |
| `NEXT_PUBLIC_CONVEX_URL` | ✓ | public Convex URL — **baked in at build time** |
| `CONVEX_SELF_HOSTED_URL` | ✓ | private Convex URL (e.g. `http://convex.railway.internal:3210`) |
| `CONVEX_DEPLOY_KEY` | ✓ | Convex admin key |
| `OCR_URL`, `OCR_API_KEY` | ✓ | private OCR URL + shared key |
| `EMAIL_FROM`, `SMTP_URL` | ✓ | see "Email" below |
| `SMS_PROVIDER` + `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_FROM` | ✓ | see "SMS" below |
| `QUEENIX_ADMIN_TOKEN` | ✓ | guards the role-assignment API |
| `SCANNER_API_KEY` | ✓ | door/fingerprint devices send it as `X-Scanner-Key` (or `?key=`) |
| `STRIPE_SECRET_KEY`/`STRIPE_WEBHOOK_SECRET`, `TAP_SECRET_KEY`/`TAP_WEBHOOK_SECRET` | for online card payments | AED charges use Tap when its key is set, else Stripe. Without keys online checkout errors; counter/cash still works. Leave `PAYMENTS_PROVIDER` unset — `mock` is refused in production. |
| `AUTH_IP_HEADER` | ✓ (or `AUTH_TRUSTED_PROXIES`) | header your edge **overwrites** with the real client IP, for per-IP auth rate limits: `x-real-ip` on Railway, `cf-connecting-ip` behind Cloudflare. Never a header clients can set themselves: a client-chosen `x-forwarded-for` gets a fresh rate-limit bucket per request. |
| `AUTH_TRUSTED_PROXIES` | behind an appending proxy | comma-separated proxy CIDRs (e.g. the AWS ALB subnets `10.0.0.0/16`). `x-forwarded-for` is then read from the right, skipping these hops, so the client-supplied left part is ignored. Don't use `x-forwarded-for` without this. If neither variable is set, no header is trusted and every client shares one rate-limit bucket (no bypass, but one abuser can lock out everyone); the server logs a warning at boot. |

### Convex (`convex`) environment

`INSTANCE_NAME`, `INSTANCE_SECRET`, `POSTGRES_URL` (no database name —
Convex uses the database named after `INSTANCE_NAME`), `DO_NOT_REQUIRE_SSL=1`
on a private network, `CONVEX_CLOUD_ORIGIN` (public API URL),
`CONVEX_SITE_ORIGIN`.

### Convex deploy job

`CONVEX_SELF_HOSTED_URL`, `CONVEX_SELF_HOSTED_ADMIN_KEY`, `AUTH_BASE_URL`,
`APP_URL` (both = the public web URL). It sets these on the Convex deployment
and runs `convex deploy`.

## 3. Email and SMS providers

**Email** — any provider with SMTP. Set `SMTP_URL` and `EMAIL_FROM` (a verified sender/domain):

| Provider | `SMTP_URL` |
|---|---|
| Resend | `smtps://resend:<API_KEY>@smtp.resend.com:465` |
| AWS SES | `smtps://<SMTP_USER>:<SMTP_PASS>@email-smtp.<region>.amazonaws.com:465` |
| SendGrid | `smtps://apikey:<API_KEY>@smtp.sendgrid.net:465` |
| Postmark | `smtp://<SERVER_TOKEN>:<SERVER_TOKEN>@smtp.postmarkapp.com:587` |

URL-encode special characters in passwords. Verify your sending domain (SPF/DKIM) with the provider or codes land in spam.

**SMS** — `SMS_PROVIDER=twilio` with `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`,
`TWILIO_FROM` (a Twilio number or approved sender ID). UAE numbers need a
registered alphanumeric sender ID with Twilio. Another SMS provider = one small
adapter in `packages/auth/src/notify.ts`.

What sends what: sign-up (email verification code), password reset (email
code), phone sign-in and phone verification (SMS code). Codes: 6 digits, 10
minutes, 5 attempts, stored hashed.

## 4. Railway

Infrastructure is defined in `.railway/railway.ts` (Railway IaC).

Needs Railway CLI **5.x** (`npm i -g @railway/cli@latest`; 4.x has no `config` command).

```bash
railway login
railway init            # or: railway link  (existing project)
# edit REPO in .railway/railway.ts to your GitHub repo, then:
railway config plan     # preview
railway config apply    # creates Postgres ×2, volume, convex, ocr, convex-deploy, web
```

Then set secrets (values from `gen-secrets.mjs`, your providers, and the admin key):

```bash
railway variable set -s convex INSTANCE_SECRET=$(openssl rand -hex 32)
railway ssh -s convex            # run ./generate_admin_key.sh → copy the key
railway variable set -s convex-deploy CONVEX_SELF_HOSTED_ADMIN_KEY=<admin key>
railway variable set -s web AUTH_SECRET=… QUEENIX_ADMIN_TOKEN=… SCANNER_API_KEY=… \
  CONVEX_DEPLOY_KEY=<admin key> OCR_API_KEY=… \
  'EMAIL_FROM=Queenix Gym <no-reply@yourdomain.com>' 'SMTP_URL=smtps://…' \
  TWILIO_ACCOUNT_SID=… TWILIO_AUTH_TOKEN=… TWILIO_FROM=…
node scripts/gen-secrets.mjs --only AUTH_JWKS | railway variable set -s web --stdin AUTH_JWKS
railway variable set -s ocr OCR_API_KEY=<same as web>
```

First deploy order: `convex` → `convex-deploy` (wait for "Convex functions
deployed.") → `ocr` → `web`. Afterwards every push redeploys the changed
services. Add custom domains in Railway for `web` and `convex`, then update
`AUTH_BASE_URL` / `NEXT_PUBLIC_CONVEX_URL` (rebuild web — it's baked in).

## 5. AWS

Same images; the usual mapping:

| Piece | AWS |
|---|---|
| `web`, `ocr`, `convex` | ECS Fargate services (or App Runner for `web`/`ocr`) behind an ALB |
| `convex-deploy` | ECS run-task after each release (CI step) |
| Postgres ×2 | RDS for PostgreSQL (17+) |
| Convex files | EFS mounted at `/convex/data`, or S3 via Convex's `S3_*` variables |
| Secrets | Secrets Manager → ECS task env |
| TLS / domains | ACM certificates on the ALB, Route 53 |

Keep `ocr` and both databases in private subnets; only `web` and `convex` are public.

## 6. Mobile (EAS)

```bash
cd apps/mobile
npx eas-cli login && npx eas-cli init          # links the Expo project
npx eas-cli env:create --environment production --name EXPO_PUBLIC_AUTH_BASE_URL --value https://app.yourdomain.com
npx eas-cli env:create --environment production --name EXPO_PUBLIC_CONVEX_URL --value https://api.yourdomain.com
npx eas-cli build --profile preview --platform all      # internal testers
npx eas-cli build --profile production --platform all   # store builds
npx eas-cli submit --profile production
```

## 7. Operations

- **Health:** `GET /api/health` (web + auth DB), `GET /health` (ocr), `GET /version` (convex).
- **Backups:** enable daily backups on both Postgres instances and the Convex volume.
- **Convex upgrades:** change the pinned image tag deliberately; read Convex's self-hosted `upgrading.md` first.
- **Scanners:** configure door/fingerprint devices to POST to `/api/scanner/*` with `X-Scanner-Key`.
- **Demo data:** never run the `seed` job against production.
