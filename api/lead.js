// POST /api/lead: the builder saves its lead as the visitor moves through it.
//   stage "details"  → right after the details pop-up (who it's for + contact details)
//   stage "curated"  → a domain was picked and the box was shown
//   stage "pay"      → the visitor pressed the pay button (sent to Razorpay)
// One row per visit, keyed by a random id from the browser; later stages update the same row.
import { P, pipeline, cleanPhone, cleanEmail, cleanText, clientIp } from "./_lib.js";

const STAGES = ["details", "curated", "pay"];
const DOMAINS = ["Data & AI", "Tech & AI", "Marketing & AI", "Management & AI"];

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "POST only" });
  const b = typeof req.body === "string" ? safeJson(req.body) : req.body || {};
  const id = String(b.id || "");
  if (!/^[a-z0-9-]{16,40}$/i.test(id)) return res.status(400).json({ error: "bad id" });
  const stage = STAGES.includes(b.stage) ? b.stage : "";
  if (!stage) return res.status(400).json({ error: "bad stage" });
  const mode = b.mode === "other" ? "other" : b.mode === "self" ? "self" : "";
  if (!mode) return res.status(400).json({ error: "bad mode" });

  const buyer = { name: cleanText(b.buyer?.name, 80), phone: cleanPhone(b.buyer?.phone), email: cleanEmail(b.buyer?.email) };
  if (!buyer.name || !buyer.phone || !buyer.email) return res.status(400).json({ error: "your name, mobile and email are needed" });
  let recipient = null;
  if (mode === "other") {
    recipient = { name: cleanText(b.recipient?.name, 80), phone: cleanPhone(b.recipient?.phone), email: cleanEmail(b.recipient?.email), note: cleanText(b.recipient?.note, 400) };
    if (!recipient.name || !recipient.phone || !recipient.email) return res.status(400).json({ error: "their name, mobile and email are needed" });
  }
  const domain = DOMAINS.includes(b.domain) ? b.domain : "";

  try {
    // light abuse guard: 30 writes a minute per IP
    const ip = clientIp(req);
    const [n] = await pipeline([["INCR", `${P}rl:${ip}`], ["EXPIRE", `${P}rl:${ip}`, 60]]);
    if (n > 30) return res.status(429).json({ error: "too many requests" });

    const [prevRaw] = await pipeline([["HGET", `${P}leads`, id]]);
    const prev = prevRaw ? safeJson(prevRaw) || {} : {};
    const now = new Date().toISOString();
    const rank = (s) => STAGES.indexOf(s);
    const row = {
      id, created: prev.created || now, updated: now,
      stage: rank(stage) >= rank(prev.stage || "details") ? stage : prev.stage, // never move backwards
      mode, buyer, recipient, domain: domain || prev.domain || "",
      source: prev.source || cleanText(b.source, 160),
      device: prev.device || (/Mobi|Android|iPhone/i.test(String(req.headers["user-agent"] || "")) ? "mobile" : "desktop"),
    };
    await pipeline([
      ["HSET", `${P}leads`, id, JSON.stringify(row)],
      ["ZADD", `${P}leads:idx`, Date.parse(row.created), id],
    ]);
    return res.status(200).json({ ok: true });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: "could not save" });
  }
}

function safeJson(s) { try { return JSON.parse(s); } catch { return null; } }
