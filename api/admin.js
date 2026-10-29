// GET /api/admin: every lead, newest first, for the /admin page. Needs the admin PIN in the
// `x-admin-pin` header (Vercel env var ADMIN_PIN). Read-only: nothing here changes data.
import { P, pipeline } from "./_lib.js";
import { timingSafeEqual } from "node:crypto";

function pinOk(given) {
  const want = String(process.env.ADMIN_PIN || "");
  const a = Buffer.from(String(given || "")), b = Buffer.from(want);
  return want.length > 0 && a.length === b.length && timingSafeEqual(a, b);
}

export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  if (!pinOk(req.headers["x-admin-pin"])) return res.status(401).json({ error: "wrong PIN" });
  try {
    const [ids] = await pipeline([["ZRANGE", `${P}leads:idx`, 0, -1, "REV"]]);
    const rows = [];
    for (let i = 0; i < (ids || []).length; i += 500) {
      const chunk = ids.slice(i, i + 500);
      const [vals] = await pipeline([["HMGET", `${P}leads`, ...chunk]]);
      (vals || []).forEach((v) => { if (v) { try { rows.push(JSON.parse(v)); } catch {} } });
    }
    return res.status(200).json({ leads: rows, at: new Date().toISOString() });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: "could not load" });
  }
}
