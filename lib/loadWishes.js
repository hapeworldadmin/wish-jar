import { fallbackPayload } from "../src/data/fallback-wishes.js";
import { FEED_URL, PADLET_PAGE_URL } from "./constants.js";
import { parseFeedXml } from "./parseFeed.js";
import { attachPrintImages } from "./printImages.js";

function printUrlFor(feedUrl) {
  try {
    const url = new URL(feedUrl);
    if (!url.pathname.endsWith("/feed.xml")) return "";
    url.pathname = url.pathname.replace(/feed\.xml$/, "print.html");
    url.search = "";
    return url.toString();
  } catch {
    return "";
  }
}

function fallbackResult(fetchedAt) {
  return {
    source: "fallback",
    fetchedAt,
    count: fallbackPayload.wishes.length,
    padletUrl: PADLET_PAGE_URL,
    wishes: fallbackPayload.wishes,
  };
}

export async function loadWishes({
  fetchImpl = globalThis.fetch,
  feedUrl = process.env.PADLET_FEED_URL || FEED_URL,
  timeoutMs = 8000,
  now = () => new Date(),
  logger = console,
} = {}) {
  const fetchedAt = now().toISOString();
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  const headers = {
    accept: "text/html, application/rss+xml, application/xml, text/xml, */*",
    "user-agent":
      "Mozilla/5.0 (compatible; ACSEpseenWishes/1.0; +https://acs-epseen.vercel.app)",
  };
  try {
    const printUrl = printUrlFor(feedUrl);
    const [response, printResponse] = await Promise.all([
      fetchImpl(feedUrl, { signal: ctrl.signal, headers }),
      printUrl
        ? fetchImpl(printUrl, { signal: ctrl.signal, headers }).catch(() => null)
        : Promise.resolve(null),
    ]);
    if (!response?.ok) {
      throw new Error(`Feed responded ${response?.status || "without a status"}`);
    }
    const xml = await response.text();
    let wishes = parseFeedXml(xml);
    if (!wishes.length) throw new Error("Feed did not include any wishes");
    let printHtml = "";
    if (printResponse?.ok) {
      try {
        printHtml = await printResponse.text();
      } catch {
        printHtml = "";
      }
    }
    wishes = attachPrintImages(wishes, printHtml);
    return {
      source: "padlet",
      fetchedAt,
      count: wishes.length,
      padletUrl: PADLET_PAGE_URL,
      wishes,
    };
  } catch (error) {
    logger?.error?.(`Padlet feed unavailable, using saved wishes: ${error?.message || error}`);
    return fallbackResult(fetchedAt);
  } finally {
    clearTimeout(timer);
  }
}
