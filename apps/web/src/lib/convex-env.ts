/**
 * Get the Convex HTTP API URL for the current environment.
 *
 * Self-hosted Convex: the HTTP API lives at :3210. CONVEX_SITE_URL points
 * to :3211 (the dashboard UI) and is NOT the API endpoint.
 *
 * Cloud Convex: there's no split — the cloud URL serves both dashboard
 * (browser) and API (queries/mutations) on the same origin.
 *
 * Resolution order:
 *   1. CONVEX_SELF_HOSTED_URL — explicit override (server-side)
 *   2. NEXT_PUBLIC_CONVEX_URL — public URL exposed to the browser client
 *   3. CONVEX_SITE_URL — fallback (works for cloud; self-hosted returns dashboard URL)
 */
export function getConvexApiUrl(): string | undefined {
  return (
    process.env.CONVEX_SELF_HOSTED_URL ??
    process.env.NEXT_PUBLIC_CONVEX_URL ??
    process.env.CONVEX_SITE_URL
  )
}
