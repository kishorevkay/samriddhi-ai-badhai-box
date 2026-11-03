// POST /api/lead: the builder saves its lead as the visitor moves through it.
//   stage "details"  → right after the details pop-up (who it's for + contact details)
//   stage "curated"  → a domain was picked and the box was shown
//   stage "pay"      → the visitor pressed the pay button (sent to Razorpay)
// One row per visit, keyed by a random id from the browser; later stages update the same row.
// Every stage needs consent: true (the required tick in the pop-up); the row keeps consent + consentAt.
// box = the exact courses drawn into the visitor's box (with their swaps), so the team knows what to unlock.
import { P, pipeline, cleanPhone, cleanEmail, cleanText, clientIp } from "./_lib.js";

const STAGES = ["details", "curated", "pay"];
const DOMAINS = ["Data & AI", "Tech & AI", "Marketing & AI", "Management & AI"];

export default async function handler(req, res) {
  // copies of the site on other hosts (upgrad.com/your-diwali-gift) post here cross-site with a text/plain body and no cookies,
  // so any origin may call it; OPTIONS is answered in case a browser or proxy preflights anyway
  res.setHeader("Access-Control-Allow-Origin", "*");
  if (req.method === "OPTIONS") {
    res.setHeader("Access-Control-Allow-Methods", "POST");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");
    res.setHeader("Access-Control-Max-Age", "86400");
    return res.status(204).end();
  }
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
  const box = cleanBox(b.box);
  // consent tick in the details pop-up is required; keep the time it was ticked (browser clock, else server time)
  if (b.consent !== true) return res.status(400).json({ error: "consent is needed" });
  const consentAt = typeof b.consentAt === "string" && !isNaN(Date.parse(b.consentAt)) ? new Date(b.consentAt).toISOString() : "";

  try {
    // light abuse guard: 120 writes per IP per fixed 60 s window. SET NX opens the window once; re-arming EXPIRE on every write
    // (as before) kept the counter alive for as long as traffic kept coming, so a busy shared IP (office, mobile carrier NAT) was refused for good
    const rl = `${P}rl:${clientIp(req)}`;
    const [, n] = await pipeline([["SET", rl, 0, "EX", 60, "NX"], ["INCR", rl]]);
    if (n > 120) return res.status(429).json({ error: "too many requests" });

    const [prevRaw] = await pipeline([["HGET", `${P}leads`, id]]);
    const prev = prevRaw ? safeJson(prevRaw) || {} : {};
    const now = new Date().toISOString();
    const rank = (s) => STAGES.indexOf(s);
    const row = {
      id, created: prev.created || now, updated: now,
      stage: rank(stage) >= rank(prev.stage || "details") ? stage : prev.stage, // never move backwards
      mode, buyer, recipient, domain: domain || prev.domain || "",
      consent: true, consentAt: prev.consentAt || consentAt || now,
      box: box || prev.box || null,
      source: prev.source || cleanText(b.source, 160),
      site: prev.site || siteOf(req),
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

// the exact courses in the visitor's box (drawn at random, swappable): short strings only, known keys only
function cleanBox(x) {
  if (!x || typeof x !== "object") return null;
  const one = (v) => cleanText(v, 160);
  const list = (v) => (Array.isArray(v) ? v.slice(0, 6).map(one).filter(Boolean) : []);
  const box = { essential: one(x.essential), mastery: one(x.mastery), short: list(x.short), ai: list(x.ai), free: list(x.free), bigger: list(x.bigger) };
  return box.mastery ? box : null;
}

function safeJson(s) { try { return JSON.parse(s); } catch { return null; } }

// which copy of the site the lead came from (www.upgrad.com, samriddhi-gift-draft.vercel.app, …), from the browser's Origin / Referer
function siteOf(req) {
  for (const h of [req.headers.origin, req.headers.referer]) {
    try { if (h && h !== "null") return cleanText(new URL(h).host, 80); } catch {}
  }
  return "";
}
