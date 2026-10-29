// Shared helpers for the AI Badhai Box lead capture.
//
// Storage is Upstash Redis over its REST API (plain fetch, no SDK).
// ⚠️ The database is SHARED with other projects. Every key here is namespaced
// under `badhai:`. Never run FLUSHDB / FLUSHALL against it.
//   badhai:leads      hash   id → lead JSON
//   badhai:leads:idx  zset   id scored by created time (newest first in the admin)
//   badhai:rl:<ip>    string per-IP write counter, expires after 60 s

import { memPipeline } from "./_mem.js";

const REST_URL = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL || "";
const REST_TOKEN = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN || "";
const isDeployed = ["production", "preview"].includes(process.env.VERCEL_ENV || "");

export const P = process.env.BADHAI_PREFIX || "badhai:";

export async function pipeline(commands) {
  if (!commands.length) return [];
  if (!(REST_URL && REST_TOKEN)) {
    if (isDeployed) throw new Error("No database configured: set KV_REST_API_URL and KV_REST_API_TOKEN.");
    return memPipeline(commands); // local dev only
  }
  const res = await fetch(`${REST_URL}/pipeline`, {
    method: "POST",
    headers: { Authorization: `Bearer ${REST_TOKEN}`, "Content-Type": "application/json" },
    body: JSON.stringify(commands),
  });
  if (!res.ok) throw new Error(`Upstash ${res.status}: ${await res.text()}`);
  return (await res.json()).map((e) => {
    if (e.error) throw new Error(`Upstash command failed: ${e.error}`);
    return e.result;
  });
}

export function cleanPhone(v) {
  let d = String(v || "").replace(/\D/g, "");
  if (d.length === 12 && d.startsWith("91")) d = d.slice(2);
  if (d.length === 11 && d.startsWith("0")) d = d.slice(1);
  return /^[6-9]\d{9}$/.test(d) ? d : "";
}
export function cleanEmail(v) {
  const e = String(v || "").trim().toLowerCase().slice(0, 120);
  return /^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(e) ? e : "";
}
export function cleanText(v, max) {
  return String(v || "").replace(/[\u0000-\u001f<>]/g, " ").replace(/\s+/g, " ").trim().slice(0, max);
}
export function clientIp(req) {
  return String(req.headers["x-forwarded-for"] || req.socket?.remoteAddress || "?").split(",")[0].trim();
}
