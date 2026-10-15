// Supabase Edge Function: authenticated device subscription registration.
// Requires SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY in function secrets.
// Deploy with JWT verification ENABLED.
import { createClient } from "npm:@supabase/supabase-js@2";

const origin = Deno.env.get("ALLOWED_APP_ORIGIN") || "https://ljy5747.github.io";
function cors(request: Request) {
  const from = request.headers.get("origin") || "";
  return {
    "Access-Control-Allow-Origin": from === origin ? from : origin,
    "Access-Control-Allow-Headers": "authorization, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, DELETE, OPTIONS",
    "Vary": "Origin"
  };
}
function respond(request: Request, status: number, payload: object) {
  return new Response(JSON.stringify(payload), { status, headers: { ...cors(request), "Content-Type": "application/json" } });
}
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: cors(req) });
  if (!["POST", "DELETE"].includes(req.method)) return respond(req, 405, { error: "Method not allowed" });
  if (req.headers.get("origin") !== origin) return respond(req, 403, { error: "Origin not allowed" });
  const jwt = (req.headers.get("authorization") || "").replace(/^Bearer\s+/i, "");
  if (!jwt) return respond(req, 401, { error: "Authentication required" });
  const url = Deno.env.get("SUPABASE_URL")!;
  const anon = Deno.env.get("SUPABASE_ANON_KEY")!;
  const service = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const client = createClient(url, anon);
  const { data: auth, error: authErr } = await client.auth.getUser(jwt);
  if (authErr || !auth.user) return respond(req, 401, { error: "Invalid user" });
  let body: Record<string, unknown>;
  try { body = await req.json(); } catch { return respond(req, 400, { error: "Invalid JSON" }); }
  const endpoint = body.endpoint;
  if (typeof endpoint !== "string" || endpoint.length > 2048 || !endpoint.startsWith("https://")) {
    return respond(req, 400, { error: "Invalid endpoint" });
  }
  const admin = createClient(url, service);
  if (req.method === "DELETE") {
    const { error } = await admin.from("push_subscriptions").delete().eq("user_id", auth.user.id).eq("endpoint", endpoint);
    return error ? respond(req, 500, { error: "Storage failed" }) : respond(req, 200, { ok: true });
  }
  const keys = body.keys;
  const k = keys && typeof keys === "object" ? keys as Record<string, unknown> : {};
  if (typeof k.p256dh !== "string" || typeof k.auth !== "string" ||
      k.p256dh.length > 512 || k.auth.length > 512 || !k.p256dh || !k.auth) {
    return respond(req, 400, { error: "Invalid subscription keys" });
  }
  const { error } = await admin.from("push_subscriptions").upsert({
    user_id: auth.user.id, endpoint, p256dh: k.p256dh, auth: k.auth, updated_at: new Date().toISOString()
  }, { onConflict: "user_id,endpoint" });
  return error ? respond(req, 500, { error: "Storage failed" }) : respond(req, 200, { ok: true });
});
