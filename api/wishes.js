import { loadWishes } from "../lib/loadWishes.js";

const LIVE_CACHE = "public, max-age=60, s-maxage=180, stale-while-revalidate=300";
const FALLBACK_CACHE = "public, max-age=0, s-maxage=30, stale-while-revalidate=60";

export default async function handler(req, res) {
  const method = req.method || "GET";
  if (method === "OPTIONS") {
    res.statusCode = 204;
    res.setHeader("Allow", "GET, HEAD, OPTIONS");
    res.end();
    return;
  }
  if (method !== "GET" && method !== "HEAD") {
    res.statusCode = 405;
    res.setHeader("Allow", "GET, HEAD");
    res.setHeader("Content-Type", "application/json; charset=utf-8");
    res.end(JSON.stringify({ error: "Method not allowed" }));
    return;
  }

  const payload = await loadWishes();
  const cache = payload.source === "padlet" ? LIVE_CACHE : FALLBACK_CACHE;
  res.statusCode = 200;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Cache-Control", cache);
  res.setHeader("CDN-Cache-Control", cache);
  res.setHeader("X-Wishes-Source", payload.source);
  if (method === "HEAD") {
    res.end();
    return;
  }
  res.end(JSON.stringify(payload));
}
