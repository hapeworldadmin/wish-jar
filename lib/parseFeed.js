import { decodeXml, extractAuthor, sanitizeWishHtml, stripTags } from "./sanitize.js";

function tagText(block, tag) {
  const match = block.match(new RegExp(`<${tag}\\b[^>]*>([\\s\\S]*?)</${tag}>`, "i"));
  if (!match) return "";
  let value = match[1].trim();
  const cdata = value.match(/^<!\[CDATA\[([\s\S]*?)\]\]>$/);
  if (cdata) value = cdata[1];
  return decodeXml(value).replace(/^\uFEFF/, "").trim();
}

function enclosureUrl(block) {
  const tag = block.match(/<enclosure\b([^>]*)\/?>/i);
  if (!tag) return null;
  const attr = tag[1].match(/\burl\s*=\s*(?:"([^"]*)"|'([^']*)')/i);
  const raw = decodeXml((attr?.[1] ?? attr?.[2] ?? "").trim());
  if (!raw || !/^https:\/\//i.test(raw)) return null;
  try {
    const url = new URL(raw);
    if (url.username || url.password) return null;
    if (url.protocol !== "https:") return null;
    return url.toString();
  } catch {
    return null;
  }
}

export function parsePadletDate(value) {
  if (!value) return null;
  const match = String(value).match(
    /(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})(?::(\d{2}))?/,
  );
  if (match) {
    const [, year, month, day, hour, minute, second] = match;
    return new Date(
      Date.UTC(
        Number(year),
        Number(month) - 1,
        Number(day),
        Number(hour),
        Number(minute),
        Number(second || 0),
      ),
    ).toISOString();
  }
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
}

function wishId(link, guid, title) {
  const source = `${guid || ""} ${link || ""}`;
  const numeric = source.match(/(\d{5,})/);
  if (numeric) return numeric[1];
  let hash = 2166136261;
  const basis = source.trim() || title || "wish";
  for (let i = 0; i < basis.length; i += 1) {
    hash ^= basis.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return `w${(hash >>> 0).toString(16)}`;
}

export function parseFeedXml(xml) {
  const source = String(xml || "").replace(/^\uFEFF/, "");
  const wishes = [];
  const itemRe = /<item\b[^>]*>([\s\S]*?)<\/item>/gi;
  let match = itemRe.exec(source);
  while (match) {
    const block = match[1];
    const link = tagText(block, "link");
    const guid = tagText(block, "guid");
    const rawTitle = stripTags(tagText(block, "title")).slice(0, 500);
    const html = sanitizeWishHtml(tagText(block, "description")).slice(0, 20000);
    const title = rawTitle || "A wish";
    wishes.push({
      id: wishId(link, guid, title),
      title,
      html,
      author: extractAuthor(html, tagText(block, "author")).slice(0, 80),
      image: enclosureUrl(block),
      date: parsePadletDate(tagText(block, "pubDate")),
      link: /^https:\/\//i.test(link) ? link : "",
    });
    if (wishes.length >= 500) break;
    match = itemRe.exec(source);
  }

  wishes.sort((a, b) => {
    const da = a.date || "";
    const db = b.date || "";
    if (da !== db) return da < db ? -1 : 1;
    return a.id < b.id ? -1 : 1;
  });

  return wishes;
}
