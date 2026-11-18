import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, test } from "node:test";
import handler from "../api/wishes.js";
import { loadWishes } from "../lib/loadWishes.js";
import { parseFeedXml } from "../lib/parseFeed.js";
import { sanitizeWishHtml } from "../lib/sanitize.js";
import { attachPrintImages } from "../lib/printImages.js";
import { fillLevel, layoutPapers, MAX_VISIBLE } from "../src/layout.js";

const sample = readFileSync(new URL("../data/padlet_feed_sample.xml", import.meta.url), "utf8");
const quiet = { error() {} };

function mockRes() {
  return {
    statusCode: 0,
    headers: {},
    body: "",
    setHeader(key, value) {
      this.headers[key] = value;
    },
    end(body = "") {
      this.body = body;
    },
  };
}

test("sanitizer keeps basic text and drops scripts, handlers, and images", () => {
  const html = sanitizeWishHtml(
    `<p onclick="alert(1)">Hi <em>there</em></p><script>alert(1)</script><img src=x onerror=alert(1)><a href="javascript:alert(1)">x</a><p><br></p>`,
  );
  assert.equal(html, "<p>Hi <em>there</em></p>x");
  assert.doesNotMatch(html, /script|onerror|onclick|javascript/i);
});

test("sample feed becomes eleven wishes with images and signatures", () => {
  const wishes = parseFeedXml(sample);
  assert.equal(wishes.length, 11);
  assert.equal(wishes.filter((wish) => wish.image).length, 3);
  assert.equal(wishes[0].image, null);
  assert.match(wishes[1].image, /^https:\/\/padlet-uploads/);
  assert.equal(wishes[1].author, "San");
  assert.equal(wishes[3].author, "Partner skripsinya ACS");
  assert.equal(wishes[4].author, "Hayo tebak");
  assert.equal(wishes[6].author, "Mel");
  assert.equal(wishes[8].author, "Jo");
  assert.equal(wishes[2].author, "");
  assert.match(wishes[2].title, /^ACS & Epseen/);
  assert.match(wishes[1].html, /<ol>/);
  assert.match(wishes[1].html, /Never stop dating each other/);
  assert.match(wishes[2].html, /<strong>/);
  assert.match(wishes[6].html, /commitment &amp; marriage/);
  assert.doesNotMatch(wishes[1].html, /<script|onclick|onerror/i);
  assert.ok(wishes[0].date < wishes[10].date);
});

test("unsafe enclosure urls are dropped", () => {
  const xml = `<?xml version="1.0"?><rss><channel>
    <item><title>A</title><description><p>Hi</p></description>
      <enclosure url="http://example.com/a.jpg" /><pubDate>2026-11-01 00:00:00 UTC</pubDate>
      <link>https://padlet.com/x/wish/1</link><guid>https://padlet.com/x/wish/1</guid></item>
    <item><title>B</title><author>Ada</author><description><p>Xoxo, San</p></description>
      <enclosure url="javascript:alert(1)" /><pubDate>2026-11-02 00:00:00 UTC</pubDate>
      <link>https://padlet.com/x/wish/22</link></item>
  </channel></rss>`;
  const wishes = parseFeedXml(xml);
  assert.equal(wishes[0].image, null);
  assert.equal(wishes[1].image, null);
  assert.equal(wishes[1].author, "Ada");
});

test("print export supplies public photos, including more than one", () => {
  const wishes = parseFeedXml(sample);
  const printHtml = `
    <article class="post">
      <h4 class="post-subject">${wishes[1].title}</h4>
      <img class="attachment-preview" src="https://v1.padlet.pics/1/image?t=c_limit,dpr_1,w_320&amp;url=https%3A%2F%2Fexample.com%2Fa.jpeg" />
      <img class="attachment-preview" src="https://evil.example/a.jpg" />
      <img class="attachment-preview" src="https://v1.padlet.pics/1/image?t=c_limit,dpr_1,w_320&amp;url=https%3A%2F%2Fexample.com%2Fb.jpeg" />
    </article>`;
  const enriched = attachPrintImages(wishes, printHtml);
  assert.equal(enriched[1].images.length, 2);
  assert.match(enriched[1].image, /^https:\/\/v1\.padlet\.pics\/1\/image\?t=c_limit,dpr_1,w_1200/);
  assert.match(enriched[1].images[1], /w_1200/);
  assert.equal(enriched[0].image, null);
  assert.deepEqual(enriched[0].images, []);
});

test("fill level looks generous at ten wishes and nearly full past a hundred", () => {
  const ten = fillLevel(10);
  const hundred = fillLevel(100);
  assert.ok(ten > 0.5 && ten < 0.7, `ten wishes fill ${ten}`);
  assert.ok(hundred > 0.85 && hundred < 0.95, `100 wishes fill ${hundred}`);
  assert.ok(hundred > ten);
});

test("letters stay inside the jar at both small and large counts", () => {
  const make = (n) =>
    Array.from({ length: n }, (_, i) => ({ id: `id-${i}`, title: "Wish" }));
  const handful = layoutPapers(make(10));
  const crowd = layoutPapers(make(150));
  assert.equal(handful.length, 10);
  assert.equal(crowd.length, MAX_VISIBLE);
  for (const paper of [...handful, ...crowd]) {
    assert.ok(paper.x >= 0 && paper.x <= 100);
    assert.ok(paper.y >= 0 && paper.y <= 100);
    assert.ok(paper.size > 8 && paper.size < 60);
  }
  assert.ok(Math.max(...handful.map((paper) => paper.y)) > 20);
  assert.ok(Math.max(...crowd.map((paper) => paper.y)) > Math.max(...handful.map((paper) => paper.y)));
});

describe("api handler", { concurrency: 1 }, () => {
  test("returns parsed wishes and a short CDN cache", async () => {
    const payload = await loadWishes({
      fetchImpl: async () => ({ ok: true, text: async () => sample }),
      logger: quiet,
    });
    assert.equal(payload.source, "padlet");
    assert.equal(payload.count, 11);

    const previous = globalThis.fetch;
    globalThis.fetch = async () => ({ ok: true, text: async () => sample });
    try {
      const res = mockRes();
      await handler({ method: "GET" }, res);
      assert.equal(res.statusCode, 200);
      assert.match(res.headers["Cache-Control"], /s-maxage=180/);
      assert.match(res.headers["Cache-Control"], /stale-while-revalidate=300/);
      assert.equal(res.headers["CDN-Cache-Control"], res.headers["Cache-Control"]);
      assert.equal(res.headers["X-Wishes-Source"], "padlet");
      const body = JSON.parse(res.body);
      assert.equal(body.count, 11);
      assert.equal(body.wishes[1].author, "San");
    } finally {
      globalThis.fetch = previous;
    }
  });

  test("serves the bundled snapshot when the feed fails, with a brief cache", async () => {
    const payload = await loadWishes({
      fetchImpl: async () => {
        throw new Error("offline");
      },
      logger: quiet,
    });
    assert.equal(payload.source, "fallback");
    assert.equal(payload.wishes.length, 11);

    const previous = globalThis.fetch;
    globalThis.fetch = async () => ({ ok: false, status: 503, text: async () => "" });
    try {
      const res = mockRes();
      await handler({ method: "GET" }, res);
      assert.equal(res.statusCode, 200);
      assert.match(res.headers["Cache-Control"], /s-maxage=30/);
      assert.equal(JSON.parse(res.body).source, "fallback");
    } finally {
      globalThis.fetch = previous;
    }
  });

  test("rejects unsupported methods", async () => {
    const res = mockRes();
    await handler({ method: "POST" }, res);
    assert.equal(res.statusCode, 405);
  });
});
