/* Account-specific notification preferences. Existing Supabase Auth JWT + RLS. */
const defaultNotificationPreferences = {
  push_enabled: false, breeding_enabled: true, reminder_enabled: true,
  record_change_enabled: false, advance_days: 1
};
async function notificationPreferencesRequest(method, userId, values) {
  const session = await authLoadSession();
  if (!session?.access) throw new Error("구글 로그인이 필요해요.");
  let authHeaders = await cloudAuthHeaders("user:authenticated", false);
  const url = SUPABASE_URL + "/rest/v1/notification_preferences" +
    (method === "GET" ? "?select=push_enabled,breeding_enabled,reminder_enabled,record_change_enabled,advance_days&limit=1" : "?on_conflict=user_id");
  const headers = { ...authHeaders, "Content-Type": "application/json" };
  if (method === "POST") headers.Prefer = "resolution=merge-duplicates,return=minimal";
  const result = await fetch(url, { method, headers,
    ...(method === "POST" ? {body: JSON.stringify({user_id:userId,...values,updated_at:new Date().toISOString()})} : {}) });
  if (!result.ok) throw new Error("알림 설정 서버 오류 (" + result.status + ")");
  return method === "GET" ? (await result.json())[0] || null : true;
}
