// api/questnudge.js — once-a-day "you have N quests waiting" via Web Push.
// Vercel cron hits this at 00:00 UTC (see vercel.json): ~6pm US Central
// (6pm CST / 7pm CDT — the send drifts an hour between seasons), ~5pm
// Arizona. It is NOT per-user-timezone.
//
// Privacy: reads each subscribed user's ascend-state ONLY to run the same
// claimableCount the app badge uses; stores nothing beyond the subscription
// and a last_sent date; the push payload is only {title, body, tag, url} —
// the count and a generic message, no quest details or personal data.
import { createClient } from "@supabase/supabase-js";
import webpush from "web-push";
import { claimableCount } from "../src/lib/stats.js";
import { questAlertText } from "../src/lib/notify.js";

// Exported so the parity test can prove the server uses the *identical*
// claimableCount the app ships — an import, not a port, so it cannot drift.
export const nudgeCount = claimableCount;
export const nudgeDayKey = (now = new Date()) => now.toLocaleDateString("en-CA", { timeZone: "America/Chicago" });

export default async function handler(req, res) {
  try {
    const secret = (process.env.CRON_SECRET || "").trim();
    const ok = secret && (req.headers.authorization === `Bearer ${secret}` || req.query.key === secret);
    if (!ok) return res.status(401).json({ error: "unauthorized" });

    const pub = (process.env.VITE_VAPID_PUBLIC_KEY || "").trim();
    const priv = (process.env.VAPID_PRIVATE_KEY || "").trim();
    if (!pub || !priv) return res.status(500).json({ error: "VAPID keys not set" });
    webpush.setVapidDetails((process.env.VAPID_SUBJECT || "mailto:support@ascend.app").trim(), pub, priv);

    const sb = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
    const onlyUid = req.query.uid || null;      // manual test: one user's subscriptions
    const force = req.query.force === "1";      // manual test: fire even at N=0 / already sent
    const day = nudgeDayKey();

    let q = sb.from("push_subscriptions").select("uid,endpoint,keys,last_sent");
    if (onlyUid) q = q.eq("uid", onlyUid);
    const { data: rows, error } = await q;
    if (error) return res.status(500).json({ error: error.message });

    const results = [];
    const stateCache = new Map();
    for (const row of rows || []) {
      if (!force && row.last_sent === day) { results.push([row.uid, "dedupe"]); continue; }
      let st = stateCache.get(row.uid);
      if (st === undefined) {
        const { data } = await sb.from("kv").select("value").eq("scope", `user:${row.uid}`).eq("key", "ascend-state").maybeSingle();
        try { st = data?.value ? JSON.parse(data.value) : null; } catch { st = null; }
        stateCache.set(row.uid, st);
      }
      const n = st ? nudgeCount(st) : 0;
      if (!force && (!st?.settings?.questAlerts || n === 0)) { results.push([row.uid, !st?.settings?.questAlerts ? "toggle-off" : "nothing-claimable"]); continue; }
      const text = questAlertText(n);
      try {
        await webpush.sendNotification({ endpoint: row.endpoint, keys: row.keys }, JSON.stringify({ title: text.title, body: text.body, tag: "ascend-quest", url: "/?tab=quests" }), { TTL: 21600 });
        await sb.from("push_subscriptions").update({ last_sent: day }).eq("uid", row.uid).eq("endpoint", row.endpoint);
        results.push([row.uid, `sent:${n}`]);
      } catch (e) {
        if (e.statusCode === 404 || e.statusCode === 410) {
          await sb.from("push_subscriptions").delete().eq("uid", row.uid).eq("endpoint", row.endpoint);
          results.push([row.uid, "dead-removed"]);
        } else results.push([row.uid, `err:${e.statusCode || e.message}`]);
      }
    }
    return res.status(200).json({ day, rows: (rows || []).length, results });
  } catch (e) {
    return res.status(500).json({ error: e?.message || String(e) });
  }
}
