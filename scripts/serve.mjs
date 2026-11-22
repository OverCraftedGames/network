// Local preview server that serves clean URLs the way GitHub Pages does: /vote serves
// vote.html, / serves index.html. No dependencies.
//
//   node scripts/serve.mjs            (http://127.0.0.1:8020)
//   node scripts/serve.mjs 8030
import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import { dirname, extname, join, normalize, sep } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const PORT = Number(process.argv[2]) || 8020;
const TYPES = {
  ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".mjs": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8", ".json": "application/json; charset=utf-8", ".svg": "image/svg+xml",
  ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".gif": "image/gif", ".webp": "image/webp",
  ".ico": "image/x-icon", ".woff2": "font/woff2", ".txt": "text/plain; charset=utf-8", ".md": "text/plain; charset=utf-8"
};

async function isFile(path) {
  try { return (await stat(path)).isFile(); } catch { return false; }
}

// Maps a request path to a file inside ROOT, or null.
async function resolve(urlPath) {
  let rel;
  try { rel = decodeURIComponent(urlPath.split("?")[0]); } catch { return null; }
  const full = normalize(join(ROOT, rel));
  if (full !== ROOT && !full.startsWith(ROOT + sep)) return null;
  const tries = rel.endsWith("/") ? [join(full, "index.html")] : [full, full + ".html", join(full, "index.html")];
  for (const path of tries) if (await isFile(path)) return path;
  return null;
}

createServer(async (req, res) => {
  const file = await resolve(req.url || "/");
  if (!file) {
    res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
    res.end("Not found");
    console.log(404, req.url);
    return;
  }
  res.writeHead(200, { "Content-Type": TYPES[extname(file).toLowerCase()] || "application/octet-stream", "Cache-Control": "no-cache" });
  res.end(await readFile(file));
}).listen(PORT, "127.0.0.1", () => console.log(`Serving ${ROOT} on http://127.0.0.1:${PORT}`));
