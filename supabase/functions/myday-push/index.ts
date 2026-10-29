// MD2-7 (Oct 14 2026): My Day phone alerts (web push).
// GET  ?op=key  -> { publicKey } (the VAPID public key; public by design).
// POST          -> sends push_digest() (or body.message when given) to every
//                  saved subscription. Needs header x-cron-secret matching
//                  app_secrets.push_cron_secret (pg_cron sends it hourly).
// VAPID keys are generated here on first use and kept in app_secrets
// (RLS on, no policies: service role only) - no key is ever handled by hand.
import webpush from "npm:web-push@3.6.7";
import { createClient } from "npm:@supabase/supabase-js@2";

const CORS = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "content-type, x-cron-secret, authorization, apikey", "Access-Control-Allow-Methods": "GET, POST, OPTIONS" };
const json = (o: unknown, status = 200) => new Response(JSON.stringify(o), { status, headers: { ...CORS, "Content-Type": "application/json" } });

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: CORS });
  const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const { data: rows, error } = await sb.from("app_secrets").select("name,value");
  if (error) return json({ error: error.message }, 500);
  const S: Record<string, string> = Object.fromEntries((rows || []).map((r: { name: string; value: string }) => [r.name, r.value]));
  if (!S.vapid_public || !S.vapid_private) {
    const k = webpush.generateVAPIDKeys();
    await sb.from("app_secrets").upsert([{ name: "vapid_public", value: k.publicKey }, { name: "vapid_private", value: k.privateKey }], { onConflict: "name", ignoreDuplicates: true });
    const { data: again } = await sb.from("app_secrets").select("name,value").in("name", ["vapid_public", "vapid_private"]);
    (again || []).forEach((r: { name: string; value: string }) => { S[r.name] = r.value; });
  }
  const url = new URL(req.url);
  if (req.method === "GET" && url.searchParams.get("op") === "key") return json({ publicKey: S.vapid_public });
  if (req.method !== "POST") return json({ error: "not found" }, 404);
  if (!S.push_cron_secret || req.headers.get("x-cron-secret") !== S.push_cron_secret) return json({ error: "forbidden" }, 403);

  const body = await req.json().catch(() => ({}));
  let msg = body && body.message ? body.message : null;
  if (!msg) {
    const { data, error: e2 } = await sb.rpc("push_digest");
    if (e2) return json({ error: e2.message }, 500);
    msg = data;
  }
  if (!msg) return json({ sent: 0, reason: "nothing to send this hour" });

  webpush.setVapidDetails("https://rpgace.vercel.app", S.vapid_public, S.vapid_private);
  let q = sb.from("push_subscriptions").select("id,endpoint,p256dh,auth");
  if (body && body.endpoint) q = q.eq("endpoint", body.endpoint);
  const { data: subs } = await q;
  let sent = 0, gone = 0;
  const errors: string[] = [];
  for (const s of subs || []) {
    try {
      await webpush.sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, JSON.stringify(msg), { TTL: 3600, urgency: "high" });   // Oct 29 2026 (Alex: "top priority above all else"): delivered at once, even in battery saver
      sent++;
      await sb.from("push_subscriptions").update({ last_ok_at: new Date().toISOString() }).eq("id", s.id);
    } catch (e) {
      const code = (e as { statusCode?: number }).statusCode;
      if (code === 404 || code === 410) { await sb.from("push_subscriptions").delete().eq("id", s.id); gone++; }
      else errors.push(String(code || (e as Error).message).slice(0, 200));
    }
  }
  if (msg.kind) await sb.from("push_log").update({ sent, note: errors.length ? errors.join("; ").slice(0, 500) : null }).eq("kind", msg.kind).eq("day", new Date().toLocaleDateString("en-CA", { timeZone: "Europe/London" }));
  return json({ sent, gone, errors, kind: msg.kind || "manual" });
});
