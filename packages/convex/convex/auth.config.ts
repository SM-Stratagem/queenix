/**
 * Queenix Gym — Convex auth config
 * Integrates with BetterAuth for authentication.
 */

export default {
  providers: [
    {
      domain: process.env.AUTH_BASE_URL || 'http://localhost:3000',
      applicationID: 'queenix-gym',
    },
  ],
};
