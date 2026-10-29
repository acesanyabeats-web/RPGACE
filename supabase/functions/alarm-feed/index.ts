// PA-2/PA-3 (Oct 28 2026, plan "Phone Alarms"): the small feed Alex's phone (MacroDroid) checks every minute.
//   ?q=status -> "RING" when a wake (or test) alarm is due and not yet stopped on the phone,
//               "SOON" when one is due within the next 150 s (WF-5, Oct 29 2026: MacroDroid lights the screen and opens
//               RPGACE early so the cover is already loaded when it rings; 150 s so a once-a-minute check
//               never misses it - a test showed a locked, dark screen does not load the app), else "WAIT".
//               Also stamps myday_settings.phone_last_seen so My Day can show the phone is connected.
//               On the first RING it picks one ready alarm sound at random and stores it on the alarm row.
//   ?q=sound  -> 302 to that alarm's sound file (or a random ready sound), for MacroDroid to save and play.
//   ?q=stop   -> marks the ringing alarm as stopped on the phone (phone_rang_at), so status goes back to WAIT.
// ☀️ I'm up in RPGACE marks the wake alarm done, which also turns status to WAIT. No secrets in responses.
const SB = Deno.env.get('SUPABASE_URL')!;
const KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const H = { apikey: KEY, Authorization: 'Bearer ' + KEY, 'Content-Type': 'application/json' };
const txt = (s: string, status = 200) => new Response(s, { status, headers: { 'Content-Type': 'text/plain', 'Cache-Control': 'no-store' } });
const KINDS = '&or=(kind.eq.wake,kind.like.test*)';

async function get(path: string) {
  const r = await fetch(SB + '/rest/v1/' + path, { headers: H });
  if (!r.ok) throw new Error('read ' + r.status);
  return await r.json();
}
async function patch(path: string, body: unknown) {
  const r = await fetch(SB + '/rest/v1/' + path, { method: 'PATCH', headers: H, body: JSON.stringify(body) });
  if (!r.ok) throw new Error('write ' + r.status);
}
async function ringing(includeStopped = false) {
  const now = new Date(), from = new Date(now.getTime() - 60 * 60000);
  const q = 'myday_alarms?select=id,kind,at,sound_url,phone_rang_at&status=eq.set' + KINDS +
    '&at=lte.' + encodeURIComponent(now.toISOString()) + '&at=gte.' + encodeURIComponent(from.toISOString()) +
    (includeStopped ? '' : '&phone_rang_at=is.null') + '&order=at.desc&limit=1';
  const rows = await get(q);
  return rows[0] || null;
}
async function soon() {
  const now = new Date(), to = new Date(now.getTime() + 150000);
  const rows = await get('myday_alarms?select=id&status=eq.set&phone_rang_at=is.null' + KINDS +
    '&at=gt.' + encodeURIComponent(now.toISOString()) + '&at=lte.' + encodeURIComponent(to.toISOString()) + '&limit=1');
  return rows.length > 0;
}
async function randomSound() {
  const rows = await get('alarm_sounds?select=url&status=eq.ready&url=not.is.null');
  return rows.length ? rows[Math.floor(Math.random() * rows.length)].url : null;
}

Deno.serve(async (req) => {
  const q = new URL(req.url).searchParams.get('q') || 'status';
  try {
    if (q === 'status') {
      await patch('myday_settings?id=eq.1', { phone_last_seen: new Date().toISOString() }).catch(() => {});
      const a = await ringing();
      if (!a) return txt(await soon() ? 'SOON' : 'WAIT');
      if (!a.sound_url) {
        const s = await randomSound();
        if (s) await patch('myday_alarms?id=eq.' + a.id, { sound_url: s });
      }
      return txt('RING');
    }
    if (q === 'sound') {
      const a = await ringing(true);
      const url = (a && a.sound_url) || await randomSound();
      if (!url) return txt('NO SOUNDS', 404);
      return new Response(null, { status: 302, headers: { Location: url, 'Cache-Control': 'no-store' } });
    }
    if (q === 'stop') {
      const a = await ringing();
      if (a) await patch('myday_alarms?id=eq.' + a.id, { phone_rang_at: new Date().toISOString() });
      return txt('OK');
    }
    return txt('unknown q', 400);
  } catch (e) {
    return txt('ERROR ' + String((e as Error).message || e).slice(0, 120), 500);
  }
});
