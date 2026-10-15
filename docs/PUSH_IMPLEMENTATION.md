# Push notifications — implementation phase 1

## Added in this branch
- `push-sw.js`: receives Web Push and handles notification click, dormant until registered.
- `push-client.js`: explicit user-gesture based subscription helper, dormant until loaded.
- `supabase/migrations/20261015_push_subscriptions.sql`: subscriptions table, user-owned RLS policies.
- `supabase/functions/push-subscription/index.ts`: save/remove subscriptions after authenticating user JWT.

## Do not deploy yet
This branch is a staging implementation, not an end-to-end system. SQL has NOT been applied to live Supabase, functions have NOT been deployed, VAPID keys have NOT been generated, and UI is NOT wired up. There is no sender or scheduler yet.

## Next phase
1. Review Supabase DB policies against existing auth and deploy SQL through migration tooling.
2. Configure `ALLOWED_APP_ORIGIN` and function secrets; deploy subscription endpoint with JWT verification.
3. Generate VAPID key pair (private key only in server secrets) and create authenticated test-send endpoint with rate limits.
4. Add an explicit opt-in button for home-screen iOS PWA / Android, and register the worker in response to the button click.
5. Run a real-device test, then implement breeding schedules, personal reminders and record updates.
6. Use `pg_cron` and `pg_net` plus Supabase Vault for server-side scheduled deliveries.

## Cautions
- Only authenticated Supabase users can register devices in this first implementation. Legacy anonymous sync-key accounts need a separate, safe migration path.
- User-owned data must not be included in notifications delivered to another account.
- Never commit the service-role key or VAPID private key to GitHub.
- Deleting a subscription should be executed on the server before unsubscribing in the browser.
