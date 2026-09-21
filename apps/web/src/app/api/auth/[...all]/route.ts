/**
 * Queenix Gym — BetterAuth handler
 * Mounts BetterAuth on the Next.js web admin so the mobile app and web
 * share a single auth endpoint.
 */

import { auth } from '@queenix/auth/server';
import { toNextJsHandler } from 'better-auth/next-js';

export const dynamic = 'force-dynamic';

export const { GET, POST } = toNextJsHandler(auth.handler);
