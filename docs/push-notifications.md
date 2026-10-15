# BeetleLog Push Notifications — Phase 1

Status: foundation only; not active in production.

## Current application
- Static React 18 via CDN + Babel runtime: `index.html`, `app.js`, `data.js`, `styles.js`
- Supabase used for cloud data and account login.
- Root `manifest.json` already declares standalone PWA mode.
- No Service Worker found at `sw.js` / `service-worker.js` during audit.

## New files
- `push-sw.js`: receives Web Push; displays notification; handles same-origin click navigation.
- `push-client.js`: opt-in registration and PushManager subscription helper.
- These files are intentionally NOT referenced by `index.html` yet. Nothing is activated.

## Prerequisites before switching on
1. Server-side VAPID public/private keypair. Never commit the private key.
2. Authenticated Supabase endpoint for saving/removing user-owned subscriptions.
3. Database tables with owner-based RLS: push_subscriptions, notification_preferences,
   notification_rules, notifications, notification_deliveries.
4. Server-side queue/cron/Edge Function that sends encrypted Web Push payloads.
5. User-facing settings button. Load `push-client.js` and invoke subscription only
   in direct response to user gesture. Send the returned subscription to server
   using the currently authenticated user's JWT.
6. Check iOS Home Screen PWA (iOS 16.4+) and Android Chrome. Test on HTTPS.

## Security and reliability
- Do not use the public Supabase publishable key to send notifications.
- Never trust a client-supplied user_id; derive identity from server-verified JWT.
- Validate that notification target URL is same-origin and within PWA scope.
- Remove expired endpoints (HTTP 404/410), apply rate limits, and enforce
  idempotency on event generation / scheduled delivery.
- Run scheduled events on server time (UTC); present schedules in KST.
- Do not log PushSubscription auth keys.
- Do not broadcast one user's breeding data to another user.

## Planned types
1. Scheduled breeding reminders (bottle change, oviposition, emergence checks).
2. User-created reminders with editable schedule.
3. Shared breeding-record change events, excluding own edits by default.

## Acceptance criteria for phase 1
- iPhone installed PWA and Android PWA can each opt in.
- A server-initiated test notification appears with page closed.
- Notification click opens BeetleLog within installed app scope.
- Revocation or expired subscription prevents future deliveries.
- Production main branch behavior stays unchanged until rollout review.
