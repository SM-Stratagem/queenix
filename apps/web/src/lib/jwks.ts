import 'server-only';

import fs from 'node:fs';
import path from 'node:path';
import {
  generateKeyPair,
  exportJWK,
  exportPKCS8,
  importPKCS8,
  SignJWT,
  type JWK,
} from 'jose';
import { isProductionRuntime, setting } from '@queenix/auth/env';

/**
 * Queenix Gym — OIDC signing keys for Convex custom auth.
 *
 * Convex verifies our short-lived tokens via OIDC discovery against this
 * Next.js app (see `/.well-known/openid-configuration` + `/api/jwks`).
 *
 * Production: the keypair comes from AUTH_JWKS (JSON from
 * `node scripts/gen-secrets.mjs`) so every instance and every redeploy signs
 * with the same key — container disks are ephemeral.
 * Development: generated once and persisted to AUTH_JWKS_PATH
 * (default `.data/jwks.json`, gitignored, mode 0600).
 */

const KEY_ID = 'queenix-dev-1';
const TOKEN_TTL_SECONDS = 60 * 5; // 5 minutes
const AUDIENCE = 'queenix-gym'; // must match Convex auth.config applicationID

export function issuer(): string {
  return setting('AUTH_BASE_URL', 'http://localhost:3000').replace(/\/+$/, '');
}

function keyPath(): string {
  const configured = process.env.AUTH_JWKS_PATH || '.data/jwks.json';
  // turbopackIgnore: runtime-configured path; don't trace the whole project into the server bundle.
  return path.isAbsolute(configured) ? configured : path.join(/*turbopackIgnore: true*/ process.cwd(), configured);
}

interface StoredKeys {
  privateKeyPkcs8: string;
  publicJwk: JWK;
}

let cache: StoredKeys | null = null;

async function loadOrCreate(): Promise<StoredKeys> {
  if (cache) return cache;
  const fromEnv = process.env.AUTH_JWKS;
  if (fromEnv) {
    const parsed = JSON.parse(fromEnv) as StoredKeys;
    if (!parsed?.privateKeyPkcs8 || !parsed?.publicJwk?.n) throw new Error('AUTH_JWKS is not a valid key JSON');
    cache = { ...parsed, publicJwk: { ...parsed.publicJwk, use: 'sig', alg: 'RS256', kid: KEY_ID } };
    return cache;
  }
  if (isProductionRuntime()) throw new Error('AUTH_JWKS is required in production');
  const file = keyPath();
  try {
    const raw = fs.readFileSync(file, 'utf8');
    cache = JSON.parse(raw) as StoredKeys;
    if (cache?.privateKeyPkcs8 && cache?.publicJwk?.n) return cache;
    cache = null;
  } catch {
    cache = null; // missing or corrupt → regenerate below
  }
  const { publicKey, privateKey } = await generateKeyPair('RS256', {
    modulusLength: 2048,
    extractable: true, // required: we persist the private key to disk
  });
  const publicJwk = await exportJWK(publicKey);
  const stored: StoredKeys = {
    privateKeyPkcs8: await exportPKCS8(privateKey),
    publicJwk: { ...publicJwk, use: 'sig', alg: 'RS256', kid: KEY_ID },
  };
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, JSON.stringify(stored, null, 2), { mode: 0o600 });
  cache = stored;
  return stored;
}

export async function publicJwks(): Promise<{ keys: JWK[] }> {
  const { publicJwk } = await loadOrCreate();
  return { keys: [publicJwk] };
}

/** Mint the short-lived RS256 JWT that Convex verifies via our JWKS. */
export async function signConvexToken(input: { sub: string; sid: string }): Promise<string> {
  const { privateKeyPkcs8 } = await loadOrCreate();
  const key = await importPKCS8(privateKeyPkcs8, 'RS256');
  const now = Math.floor(Date.now() / 1000);
  return new SignJWT({ sid: input.sid })
    .setProtectedHeader({ alg: 'RS256', kid: KEY_ID, typ: 'JWT' })
    .setIssuer(issuer())
    .setAudience(AUDIENCE)
    .setSubject(input.sub)
    .setIssuedAt(now)
    .setExpirationTime(now + TOKEN_TTL_SECONDS)
    .sign(key);
}
