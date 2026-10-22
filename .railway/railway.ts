/**
 * Railway Infrastructure as Code for Queenix Gym.
 *   railway login && railway link          (once)
 *   railway config plan                     (preview)
 *   railway config apply                    (create/update everything)
 * Secrets use preserve(): set them once with `railway variables set` (see
 * DEPLOY.md) — applying this file never overwrites them.
 * Set REPO below to your GitHub repo before the first apply.
 */
import { defineRailway, github, image, postgres, preserve, project, service, volume } from 'railway/iac';

const REPO = 'YOUR-GITHUB-ORG/queenix-gym';
const BRANCH = 'main';
// Pinned Convex backend (same as docker-compose.prod.yml). Upgrade deliberately.
const CONVEX_IMAGE = 'ghcr.io/get-convex/convex-backend:849a6fc605b5a910c9834b61a77c5475cc24d189';

export default defineRailway(() => {
  // Two Postgres instances: auth (BetterAuth) and Convex storage. Convex
  // stores its data in a database named after INSTANCE_NAME, and Railway's
  // Postgres ships one database called "railway" — so INSTANCE_NAME=railway.
  const authDb = postgres('auth-postgres');
  const convexDb = postgres('convex-postgres');
  const convexFiles = volume('convex-files', { sizeMB: 5120 });

  const convex = service('convex', {
    source: image(CONVEX_IMAGE),
    volumeMounts: { '/convex/data': convexFiles },
    healthcheck: '/version',
    domains: [{ domain: '${{RAILWAY_PUBLIC_DOMAIN}}', port: 3210 }],
    env: {
      PORT: '3210',
      INSTANCE_NAME: 'railway',
      INSTANCE_SECRET: preserve(),
      POSTGRES_URL: 'postgresql://${{convex-postgres.PGUSER}}:${{convex-postgres.PGPASSWORD}}@${{convex-postgres.RAILWAY_PRIVATE_DOMAIN}}:5432',
      // Private network traffic is unencrypted by design; Postgres is not public.
      DO_NOT_REQUIRE_SSL: '1',
      CONVEX_CLOUD_ORIGIN: 'https://${{RAILWAY_PUBLIC_DOMAIN}}',
      CONVEX_SITE_ORIGIN: 'https://${{RAILWAY_PUBLIC_DOMAIN}}/http',
    },
  });

  const ocr = service('ocr', {
    source: github(REPO, { branch: BRANCH }),
    rootDirectory: 'services/ocr',
    build: { builder: 'DOCKERFILE', dockerfilePath: 'Dockerfile', watchPatterns: ['services/ocr/**'] },
    healthcheck: '/health',
    env: { OCR_API_KEY: preserve(), OCR_THREADS: '2' },
  });

  // One-shot per release: pushes Convex functions + their env, then exits.
  const convexDeploy = service('convex-deploy', {
    source: github(REPO, { branch: BRANCH }),
    build: { builder: 'DOCKERFILE', dockerfilePath: 'deploy/convex/Dockerfile', watchPatterns: ['packages/convex/**', 'deploy/convex/**'] },
    deploy: { restartPolicyType: 'NEVER' },
    env: {
      CONVEX_SELF_HOSTED_URL: 'http://${{convex.RAILWAY_PRIVATE_DOMAIN}}:3210',
      CONVEX_SELF_HOSTED_ADMIN_KEY: preserve(),
      AUTH_BASE_URL: 'https://${{web.RAILWAY_PUBLIC_DOMAIN}}',
      APP_URL: 'https://${{web.RAILWAY_PUBLIC_DOMAIN}}',
    },
  });

  const web = service('web', {
    source: github(REPO, { branch: BRANCH }),
    build: { builder: 'DOCKERFILE', dockerfilePath: 'apps/web/Dockerfile' },
    healthcheck: '/api/health',
    domains: [{ domain: '${{RAILWAY_PUBLIC_DOMAIN}}', port: 3000 }],
    env: {
      PORT: '3000',
      // Baked into the client bundle at build time (Dockerfile ARG).
      NEXT_PUBLIC_CONVEX_URL: 'https://${{convex.RAILWAY_PUBLIC_DOMAIN}}',
      AUTH_BASE_URL: 'https://${{RAILWAY_PUBLIC_DOMAIN}}',
      AUTH_IP_HEADER: 'x-real-ip', // Railway's edge sets it to the real client IP
      DATABASE_URL: authDb.env.DATABASE_URL,
      CONVEX_SELF_HOSTED_URL: 'http://${{convex.RAILWAY_PRIVATE_DOMAIN}}:3210',
      OCR_URL: 'http://${{ocr.RAILWAY_PRIVATE_DOMAIN}}:8000',
      EMAIL_FROM: preserve(),
      SMTP_URL: preserve(),
      SMS_PROVIDER: 'twilio',
      TWILIO_ACCOUNT_SID: preserve(),
      TWILIO_AUTH_TOKEN: preserve(),
      TWILIO_FROM: preserve(),
      AUTH_SECRET: preserve(),
      AUTH_JWKS: preserve(),
      QUEENIX_ADMIN_TOKEN: preserve(),
      SCANNER_API_KEY: preserve(),
      CONVEX_DEPLOY_KEY: preserve(),
      OCR_API_KEY: preserve(),
      STRIPE_SECRET_KEY: preserve(),
      STRIPE_WEBHOOK_SECRET: preserve(),
      TAP_SECRET_KEY: preserve(),
      TAP_WEBHOOK_SECRET: preserve(),
    },
  });

  return project('queenix-gym', { resources: [authDb, convexDb, convexFiles, convex, ocr, convexDeploy, web] });
});
