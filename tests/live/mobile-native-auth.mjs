/**
 * Native (iOS/Android) auth-client check, without a simulator: runs the exact client the app
 * builds in packages/auth/src/index.ts (better-auth createAuthClient + @better-auth/expo expoClient
 * with scheme 'queenix', storagePrefix 'queenix', SecureStore) with react-native / expo modules
 * stubbed as on a phone (Platform.OS = 'ios', in-memory SecureStore). Signs in against the live
 * auth server, then asks: did the client keep the session cookie, and does a follow-up
 * get-session / convex-token call work like it must on a phone?
 *
 * Run: node tests/live/mobile-native-auth.mjs [authBaseUrl] [email] [password] [--with-cookie-prefix]
 */
import { register } from 'node:module';

const stubs = {
  'react-native': `export const Platform = { OS: 'ios', select: (o) => o.ios ?? o.default };
    export const AppState = { currentState: 'active', addEventListener: () => ({ remove() {} }) };`,
  'expo-constants': `export default { expoConfig: { scheme: 'queenix' }, platform: {} };`,
  'expo-linking': `export const createURL = (p = '', o = {}) => \`\${o.scheme ?? 'queenix'}://\${p.replace(/^\\//, '')}\`;`,
  'expo-web-browser': `export const openAuthSessionAsync = async () => ({ type: 'cancel' });`,
  'expo-network': `export const addNetworkStateListener = () => ({ remove() {} }); export const getNetworkStateAsync = async () => ({ isConnected: true });`,
};
register(
  'data:text/javascript,' +
    encodeURIComponent(`
      const stubs = ${JSON.stringify(stubs)};
      export async function resolve(spec, ctx, next) {
        if (spec in stubs) return { url: 'data:text/javascript,' + encodeURIComponent(stubs[spec]), shortCircuit: true };
        return next(spec, ctx);
      }`),
);

const fixed = process.argv.includes('--with-cookie-prefix');
const [base = 'http://10.12.19.174:4000', email = 'member@queenix.test', password = 'QueenixDemo123!'] = process.argv.slice(2).filter((a) => !a.startsWith('--'));
const store = new Map();
const SecureStore = {
  getItemAsync: async (k) => store.get(k) ?? null,
  setItemAsync: async (k, v) => void store.set(k, v),
  deleteItemAsync: async (k) => void store.delete(k),
};
// React Native's fetch sends only the headers the app sets (no Origin, no Sec-Fetch-*),
// unlike Node's undici, so use a bare node:http fetch to mirror a phone.
import http from 'node:http';
function rnFetch(input, init = {}) {
  const url = new URL(typeof input === 'string' ? input : input.url ?? String(input));
  const headers = Object.fromEntries(new Headers(init.headers ?? {}));
  const body = init.body == null ? undefined : typeof init.body === 'string' ? init.body : JSON.stringify(init.body);
  if (body && !headers['content-type']) headers['content-type'] = 'application/json';
  return new Promise((resolve, reject) => {
    const req = http.request(url, { method: init.method ?? 'GET', headers }, (res) => {
      const chunks = [];
      res.on('data', (c) => chunks.push(c));
      res.on('end', () => {
        const h = new Headers();
        for (const [k, v] of Object.entries(res.headers)) for (const x of [].concat(v)) h.append(k, x);
        resolve(new Response(res.statusCode === 204 ? null : Buffer.concat(chunks), { status: res.statusCode, headers: h }));
      });
    });
    req.on('error', reject);
    if (body) req.write(body);
    req.end();
  });
}
const { createAuthClient } = await import('better-auth/react');
const { expoClient } = await import('@better-auth/expo/client');

// Same options as packages/auth/src/index.ts.
const client = createAuthClient({
  baseURL: base,
  fetchOptions: { customFetchImpl: rnFetch },
  // --with-cookie-prefix: proposed fix (match the server's advanced.cookiePrefix 'queenix').
  plugins: [expoClient({ scheme: 'queenix', storagePrefix: 'queenix', storage: SecureStore, ...(fixed ? { cookiePrefix: 'queenix' } : {}) })],
});

let signIn;
for (let i = 0; i < 6; i++) {
  signIn = await client.signIn.email({ email, password });
  if (signIn.error?.status !== 429) break; // shared 10/min/IP sign-in limit: wait it out
  await new Promise((r) => setTimeout(r, 15_000));
}
console.log('sign-in:', signIn.error ? `ERROR ${signIn.error.status} ${signIn.error.message}` : `ok (user ${signIn.data?.user?.email})`);
const stored = store.get('queenix_cookie');
console.log('stored cookie (queenix_cookie):', stored && stored !== '{}' ? Object.keys(JSON.parse(stored)).join(', ') : 'NONE');
const session = await client.getSession();
console.log('get-session after sign-in:', session.data?.user?.email ?? `NO SESSION ${session.error ? session.error.status : ''}`);
const tok = await client.$fetch(`${base}/api/convex/token`);
console.log('/api/convex/token:', tok.data?.token ? 'token ok' : `FAILED ${tok.error?.status ?? ''} ${JSON.stringify(tok.error ?? tok.data)}`);
// A cookie-bearing POST (what sign-out / change-password / verify-email send): needs the origin check to accept the app.
const out = await client.signOut();
console.log('sign-out (cookie-bearing POST):', out.error ? `ERROR ${out.error.status} ${out.error.message}` : 'ok');
process.exit(!out.error && stored && stored !== '{}' && session.data?.user && tok.data?.token ? 0 : 1);
