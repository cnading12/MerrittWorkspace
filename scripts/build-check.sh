#!/usr/bin/env bash
#
# Production build check with placeholder secrets.
#
# `next build` imports every API route to collect page data. Several routes
# construct their Stripe client at module scope (`new Stripe(process.env
# .STRIPE_SECRET_KEY!)`), so with no env at all the build dies on the first
# one it reaches — "Neither apiKey nor config.authenticator provided" — which
# looks like a broken build but is only a missing variable.
#
# Nothing here is a real credential and nothing is dialled: these values only
# have to be present and syntactically plausible for the module-scope clients
# to construct. The build never issues a network call.
#
# Real secrets belong in Vercel's project settings, never in this file.
set -euo pipefail

cd "$(dirname "$0")/.."

# Only fill in what the developer has not already set, so running this with a
# real .env.local loaded still checks the real configuration.
export STRIPE_SECRET_KEY="${STRIPE_SECRET_KEY:-sk_test_buildcheck}"
export STRIPE_WEBHOOK_SECRET="${STRIPE_WEBHOOK_SECRET:-whsec_buildcheck}"
export STRIPE_WEBHOOK_SECRET_SNACKSHOP="${STRIPE_WEBHOOK_SECRET_SNACKSHOP:-whsec_buildcheck}"
export STRIPE_SUBSCRIPTION_WEBHOOK_SECRET="${STRIPE_SUBSCRIPTION_WEBHOOK_SECRET:-whsec_buildcheck}"
export NEXT_PUBLIC_SUPABASE_URL="${NEXT_PUBLIC_SUPABASE_URL:-https://buildcheck.supabase.co}"
export NEXT_PUBLIC_SUPABASE_ANON_KEY="${NEXT_PUBLIC_SUPABASE_ANON_KEY:-buildcheck}"
export SUPABASE_SERVICE_ROLE_KEY="${SUPABASE_SERVICE_ROLE_KEY:-buildcheck}"
export RESEND_API_KEY="${RESEND_API_KEY:-re_buildcheck}"
export PORTAL_CANCEL_TOKEN_SECRET="${PORTAL_CANCEL_TOKEN_SECRET:-buildcheck}"
export CRON_SECRET="${CRON_SECRET:-buildcheck}"
export NEXT_PUBLIC_BASE_URL="${NEXT_PUBLIC_BASE_URL:-http://localhost:3000}"

exec npx next build
