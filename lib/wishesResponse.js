import { loadWishes } from "./loadWishes.js";

export const LIVE_CACHE = "public, max-age=60, s-maxage=180, stale-while-revalidate=300";
export const FALLBACK_CACHE = "public, max-age=0, s-maxage=30, stale-while-revalidate=60";

const JSON_TYPE = "application/json; charset=utf-8";

function cacheHeaders(cache, source) {
  return {
    "Content-Type": JSON_TYPE,
    "Cache-Control": cache,
    "CDN-Cache-Control": cache,
    "Netlify-CDN-Cache-Control": cache,
    "X-Wishes-Source": source,
  };
}

/** Shared GET/HEAD/OPTIONS result used by the Vercel and Netlify adapters. */
export async function wishesResponse(method = "GET") {
  const verb = String(method || "GET").toUpperCase();
  if (verb === "OPTIONS") {
    return { status: 204, headers: { Allow: "GET, HEAD, OPTIONS" }, body: null };
  }
  if (verb !== "GET" && verb !== "HEAD") {
    return {
      status: 405,
      headers: {
        Allow: "GET, HEAD",
        "Content-Type": JSON_TYPE,
      },
      body: JSON.stringify({ error: "Method not allowed" }),
    };
  }

  const payload = await loadWishes();
  const cache = payload.source === "padlet" ? LIVE_CACHE : FALLBACK_CACHE;
  return {
    status: 200,
    headers: cacheHeaders(cache, payload.source),
    body: verb === "HEAD" ? null : JSON.stringify(payload),
  };
}
