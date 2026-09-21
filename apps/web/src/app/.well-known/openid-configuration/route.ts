import { NextResponse } from 'next/server';
import { issuer } from '@/lib/jwks';

export const dynamic = 'force-dynamic';

/**
 * OIDC discovery document for Convex custom auth.
 * Convex fetches this from the auth.config `domain` to learn our
 * issuer + JWKS endpoint, then verifies the RS256 tokens minted by
 * /api/convex/token.
 */
export async function GET() {
  const iss = issuer();
  return NextResponse.json({
    issuer: iss,
    jwks_uri: `${iss}/api/jwks`,
    response_types_supported: ['id_token'],
    subject_types_supported: ['public'],
    id_token_signing_alg_values_supported: ['RS256'],
    claims_supported: ['sub', 'sid', 'iss', 'aud', 'iat', 'exp'],
  });
}
