// Local dev server: serves the site and mounts the api/ handlers the way Vercel does,
// backed by the in-memory store (api/_mem.js). Run: node dev/server.js  → admin PIN 9999
import http from "node:http";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

process.env.ADMIN_PIN ||= "9999";
const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const handlers = {
  "/api/lead": (await import("../api/lead.js")).default,
  "/api/admin": (await import("../api/admin.js")).default,
};
const TYPES = { ".html": "text/html; charset=utf-8", ".js": "text/javascript", ".css": "text/css", ".webp": "image/webp", ".png": "image/png", ".svg": "image/svg+xml", ".jpg": "image/jpeg" };

http.createServer(async (req, res) => {
  const url = new URL(req.url, "http://x");
  const handler = handlers[url.pathname];
  if (handler) {
    let raw = "";
    for await (const chunk of req) raw += chunk;
    req.query = Object.fromEntries(url.searchParams);
    try { req.body = raw ? JSON.parse(raw) : {}; } catch { req.body = {}; }
    res.status = (code) => { res.statusCode = code; return res; };
    res.json = (obj) => { res.setHeader("Content-Type", "application/json"); res.end(JSON.stringify(obj)); };
    return handler(req, res);
  }
  let file = url.pathname === "/" ? "/index.html" : decodeURIComponent(url.pathname);
  if (!path.extname(file)) file += ".html";
  try {
    const data = await readFile(path.join(root, path.normalize(file)));
    res.setHeader("Content-Type", TYPES[path.extname(file)] || "application/octet-stream");
    res.end(data);
  } catch { res.statusCode = 404; res.end("Not found"); }
}).listen(process.env.PORT || 5250, () => console.log("http://localhost:" + (process.env.PORT || 5250)));
