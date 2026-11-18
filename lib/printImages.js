import { decodeXml, stripTags } from "./sanitize.js";

const PICTURE_HOSTS = new Set(["v1.padlet.pics", "padlet.pics"]);

export function normalizeTitle(value) {
  return stripTags(decodeXml(value)).replace(/\s+/g, " ").trim().toLowerCase();
}

/** Padlet's RSS enclosure points at a private file. The print export has a public image URL. */
export function usableImage(value) {
  if (typeof value !== "string" || !value) return null;
  try {
    const url = new URL(value.trim());
    if (url.protocol !== "https:" || url.username || url.password) return null;
    const host = url.host.toLowerCase();
    const pictured =
      PICTURE_HOSTS.has(host) ||
      host.endsWith(".padletcdn.com") ||
      (host.endsWith(".storage.googleapis.com") && url.searchParams.has("Signature"));
    if (!pictured) return null;
    return url.toString();
  } catch {
    return null;
  }
}

function sharpen(url) {
  return url.replace(/([?&]t=)([^&]*)/i, (match, prefix, transform) => {
    if (!/w_\d+/i.test(transform)) return match;
    return `${prefix}${transform.replace(/w_\d+/i, "w_1200")}`;
  });
}

function imageUrlsFrom(block) {
  const urls = [];
  const tags = block.match(/<img\b[^>]*>/gi) || [];
  for (const tag of tags) {
    if (!/attachment-preview/i.test(tag)) continue;
    const src = tag.match(/\bsrc\s*=\s*(?:"([^"]+)"|'([^']+)')/i);
    const raw = decodeXml((src?.[1] ?? src?.[2] ?? "").trim());
    const usable = usableImage(sharpen(raw));
    if (usable && !urls.includes(usable)) urls.push(usable);
  }
  return urls.slice(0, 6);
}

export function extractPrintImages(html) {
  const found = new Map();
  const articles = String(html || "").matchAll(/<article\b[^>]*>([\s\S]*?)<\/article>/gi);
  for (const article of articles) {
    const block = article[1];
    const subject = block.match(/<h4\b[^>]*post-subject[^>]*>([\s\S]*?)<\/h4>/i);
    if (!subject) continue;
    const title = normalizeTitle(subject[1]);
    const urls = imageUrlsFrom(block);
    if (title && urls.length && !found.has(title)) found.set(title, urls);
  }
  return found;
}

export function attachPrintImages(wishes, printHtml) {
  const byTitle = extractPrintImages(printHtml);
  return wishes.map((wish) => {
    const matched = byTitle.get(normalizeTitle(wish.title)) || [];
    const images = matched.length
      ? matched
      : [usableImage(wish.image)].filter(Boolean);
    return {
      ...wish,
      image: images[0] || null,
      images,
    };
  });
}
