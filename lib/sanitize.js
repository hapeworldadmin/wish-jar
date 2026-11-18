const ALLOWED = new Set([
  "p",
  "br",
  "strong",
  "b",
  "em",
  "i",
  "u",
  "ul",
  "ol",
  "li",
  "blockquote",
]);

const DANGEROUS = "script|style|iframe|object|embed|noscript|svg|math|template";

export function stripTags(value) {
  return String(value || "")
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function decodeXml(value) {
  return String(value || "")
    .replace(/&#(\d+);/g, (_, n) => {
      const code = Number(n);
      return Number.isFinite(code) ? String.fromCodePoint(code) : _;
    })
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => {
      const code = parseInt(n, 16);
      return Number.isFinite(code) ? String.fromCodePoint(code) : _;
    })
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, "&");
}

export { decodeXml };

/**
 * Allow only basic text tags. Attributes are dropped, so event handlers,
 * links, and images in the HTML cannot survive. Images belong on `image`.
 */
export function sanitizeWishHtml(input) {
  let html = String(input || "").replace(/\0/g, "");
  html = html.replace(/<!--[\s\S]*?-->/g, "");

  for (let pass = 0; pass < 3; pass += 1) {
    const next = html.replace(
      new RegExp(`<\\s*(${DANGEROUS})\\b[^>]*>[\\s\\S]*?<\\s*/\\s*\\1\\s*>`, "gi"),
      "",
    );
    if (next === html) break;
    html = next;
  }

  html = html.replace(new RegExp(`<\\s*(${DANGEROUS})\\b[\\s\\S]*$`, "gi"), "");
  html = html.replace(/\son\w+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, "");

  html = html.replace(/<\/?\s*([a-zA-Z0-9]+)(\s[^<>]*)?\s*\/?\s*>/g, (match, name) => {
    const tag = String(name).toLowerCase();
    if (!ALLOWED.has(tag)) return "";
    if (tag === "br") return "<br>";
    if (match.trim().startsWith("</")) return `</${tag}>`;
    return `<${tag}>`;
  });

  html = html.replace(/<p>\s*(?:<br>\s*)*<\/p>/gi, "");
  html = html.replace(/(?:<br>\s*){3,}/gi, "<br><br>");
  html = html.replace(/^(?:\s*<br>\s*)+|(?:\s*<br>\s*)+$/gi, "");
  return html.trim();
}

const SIGNOFF =
  "(?:xoxo|warmest regards|warm regards|with love|lots of love|best regards|kind regards|regards|sincerely|yours truly)";

function cleanName(value) {
  const name = String(value || "").replace(/\s+/g, " ").trim();
  if (!name || name.length > 48) return "";
  if (name.split(" ").length > 8) return "";
  if (!/\p{L}/u.test(name)) return "";
  return name;
}

export function extractAuthor(html, explicitAuthor) {
  const explicit = stripTags(explicitAuthor);
  if (explicit) {
    const rssName = explicit.match(/\(([^)]+)\)\s*$/);
    if (rssName && explicit.includes("@")) return cleanName(rssName[1]);
    if (explicit.includes("@") && !explicit.includes(" ")) return "";
    return cleanName(explicit) || explicit.slice(0, 48);
  }

  const text = String(html || "")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(p|li|div|blockquote|h\d)>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&quot;/g, '"');

  const lines = text
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  const named = new RegExp(`^${SIGNOFF}[,\\s]+(.{1,48})$`, "i");
  const bare = new RegExp(`^${SIGNOFF}[\\s,!:.\\uFE0F\\p{Extended_Pictographic}]*$`, "iu");
  const start = Math.max(0, lines.length - 4);

  for (let i = lines.length - 1; i >= start; i -= 1) {
    const match = lines[i].match(named);
    if (match) {
      const name = cleanName(match[1]);
      if (name) return name;
    }
  }

  for (let i = lines.length - 2; i >= start; i -= 1) {
    if (bare.test(lines[i])) {
      const name = cleanName(lines[i + 1]);
      if (name) return name;
    }
  }

  return "";
}
