# Scheduled breeding notifications — staging

Remote test pushes have succeeded on iPhone and Galaxy. This branch starts the next phase but does not enable automatic daily sends.

## Implemented
- Pure per-user reminder extraction from existing `beetlelog_data.data` JSON.
- Bottle replacement only for living larvae based on the last bottle record's `nextDate`.
- Estimated breakdown (+30 days after `setDate` without actual `breakdownDate`).
- Personal custom events, using explicit `remindDate` when present.
- Respects account-level `push_enabled`, `breeding_enabled`, `reminder_enabled`, and `advance_days` (0, 1, 3).
- At most 3: show each task; 4+: show count only.

## Before enabling production schedule
- Implement server-side daily scheduler and per-user notification deduplication table, with uniqueness on (user_id, day, kind).
- Join own Google-login data to `auth.users` securely via server-authorized identity lookup; never infer identity solely from a mutable email.
- Check opt-in again at send time. Do not send to unsubscribed/disabled accounts.
- Add execution logs, rate limiting, stale subscription removal, and timezone specification (Asia/Seoul, e.g. 09:00).
- Test with fake fixtures and inspect failures on the existing remote-push implementation, especially VAPID signing and push provider responses.
- Avoid real user data in notification body logs.

No cron job or automatic push was activated in this branch.
