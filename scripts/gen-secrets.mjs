#!/usr/bin/env node
/**
 * Print a fresh set of production secrets as .env lines.
 *   node scripts/gen-secrets.mjs >> .env.production.local
 *   node scripts/gen-secrets.mjs --only AUTH_JWKS   (one raw value, e.g. to pipe into `railway variable set --stdin`)
 * Paste them into Railway/AWS env settings. Never commit the output.
 */
import { randomBytes } from 'node:crypto';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { generateKeyPair, exportJWK, exportPKCS8 } = require('jose');

const hex = (n) => randomBytes(n).toString('hex');
const { publicKey, privateKey } = await generateKeyPair('RS256', { modulusLength: 2048, extractable: true });
const jwks = { privateKeyPkcs8: await exportPKCS8(privateKey), publicJwk: await exportJWK(publicKey) };

const lines = {
  AUTH_SECRET: randomBytes(48).toString('base64url'),
  QUEENIX_ADMIN_TOKEN: hex(32),
  SCANNER_API_KEY: hex(32),
  OCR_API_KEY: hex(32),
  AUTH_JWKS: JSON.stringify(jwks),
};
const only = process.argv.indexOf('--only');
if (only !== -1) {
  const key = process.argv[only + 1];
  if (!(key in lines)) throw new Error(`--only expects one of: ${Object.keys(lines).join(', ')}`);
  process.stdout.write(lines[key]);
} else {
  // .env format: quote the JSON so dotenv/compose keep it as one value.
  for (const [k, v] of Object.entries(lines)) console.log(k === 'AUTH_JWKS' ? `${k}='${v}'` : `${k}=${v}`);
}
