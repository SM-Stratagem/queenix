#!/bin/sh
# Required: CONVEX_SELF_HOSTED_URL, CONVEX_SELF_HOSTED_ADMIN_KEY, AUTH_BASE_URL, APP_URL
set -eu
: "${CONVEX_SELF_HOSTED_URL:?missing}" "${CONVEX_SELF_HOSTED_ADMIN_KEY:?missing}"
: "${AUTH_BASE_URL:?missing}" "${APP_URL:?missing}"
echo "Waiting for Convex at $CONVEX_SELF_HOSTED_URL ..."
i=0; until node -e "fetch(process.env.CONVEX_SELF_HOSTED_URL+'/version').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"; do
  i=$((i+1)); [ "$i" -gt 60 ] && { echo "Convex not reachable"; exit 1; }; sleep 2
done
# Env the functions read (auth.config.ts issuer; receipt links).
npx convex env set AUTH_BASE_URL "$AUTH_BASE_URL"
npx convex env set APP_URL "$APP_URL"
npx convex deploy --yes
echo "Convex functions deployed."
