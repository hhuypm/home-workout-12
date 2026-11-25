/* Tiny static server for local use: `npm start` → http://localhost:5173 */
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { extname, join, normalize, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { handleSync } from "../netlify/lib/sync-core.mjs";

const root = resolve(fileURLToPath(new URL("../public", import.meta.url)));
const port = +(process.env.PORT || 5173);
const types = {
  ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".mjs": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8", ".json": "application/json", ".webmanifest": "application/manifest+json",
  ".svg": "image/svg+xml", ".png": "image/png", ".woff2": "font/woff2", ".txt": "text/plain; charset=utf-8"
};

/* The same /api/sync the Netlify function serves, with the groups kept in memory. */
const mem = new Map();
const memStore = {
  async list({ prefix }) { return { blobs: [...mem.keys()].filter(k => k.startsWith(prefix)).map(key => ({ key })) }; },
  async get(k) { return mem.has(k) ? JSON.parse(mem.get(k)) : null; },
  async setJSON(k, v) { mem.set(k, JSON.stringify(v)); },
  async delete(k) { mem.delete(k); }
};

createServer(async (req, res) => {
  if (new URL(req.url, "http://x").pathname === "/api/sync") {
    const chunks = []; for await (const c of req) chunks.push(c);
    const r = await handleSync({ method: req.method, code: req.headers["x-sync-code"], bodyText: Buffer.concat(chunks).toString("utf8") }, memStore);
    res.writeHead(r.status, { "content-type": "application/json", "cache-control": "no-store" }).end(JSON.stringify(r.json));
    return;
  }
  let path = decodeURIComponent(new URL(req.url, "http://x").pathname);
  if (path.endsWith("/")) path += "index.html";
  const file = normalize(join(root, path));
  if (!file.startsWith(root)) { res.writeHead(403).end(); return; }
  try {
    const body = await readFile(file);
    res.writeHead(200, { "content-type": types[extname(file)] || "application/octet-stream", "cache-control": "no-cache" }).end(body);
  } catch {
    res.writeHead(404, { "content-type": "text/plain" }).end("Not found");
  }
}).listen(port, () => console.log(`Home Workout 12 → http://localhost:${port}`));
