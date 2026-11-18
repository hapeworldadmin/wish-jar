# Wishes for ACS & Epseen

A mobile-first wishes jar for Angeline (ACS) and Epseen’s wedding on Saturday, 21 November 2026. Friends keep writing on the public Padlet, and this site folds each wish into a letter inside a glowing jar.

## How live wishes stay in sync

1. Friends post on the Padlet: <https://padlet.com/agnesimmanuela/dear-acs-epseen-s025aby02lplxtpcx9li>
2. Padlet publishes an RSS feed: <https://padlet.com/padlets/s025aby02lplxtpcx9li/exports/feed.xml>
3. `GET /api/wishes` (a Vercel serverless function) fetches that feed, plus Padlet’s print export for photos. It parses each `<item>`, keeps only basic text tags in the HTML (`p`, `br`, `strong`, `em`, lists, `blockquote`), and returns JSON.
4. The response is cached at the CDN for **3 minutes**, and may be served stale for another **5 minutes** while a fresh copy is fetched:

   `Cache-Control: public, max-age=60, s-maxage=180, stale-while-revalidate=300`

   If Padlet is down, the function answers with the saved snapshot instead and caches that for only 30 seconds.
5. The page paints immediately from a snapshot bundled into the JavaScript (`src/data/fallback-wishes.js`, generated from `data/padlet_feed_sample.xml`). It then replaces that with `/api/wishes` when the request succeeds. New wishes show up on their own; nobody has to redeploy.

Photos in the RSS point at private storage links, so the function reads the public image URLs from the print export (`…/exports/print.html`) and asks Padlet’s image service for a 1200px version. Those links are refreshed whenever the function runs.

Wishes you have opened are remembered in this browser (`localStorage`), and their seals turn gold.

Optional environment variable, only if the Padlet address changes:

| Name | Default |
| --- | --- |
| `PADLET_FEED_URL` | the feed URL above |

The print-export URL is derived by swapping `feed.xml` for `print.html`.

## Run it locally

```bash
npm install
npm test
npm run dev
```

Open <http://127.0.0.1:5173>. The dev server uses the same `/api/wishes` function as production.

`npm run build` writes the static site to `dist/` and refreshes the bundled snapshot first.

## Deploy on Vercel

Import this GitHub repository. Name the project **acs-epseen** so the site is <https://acs-epseen.vercel.app>.

| Setting | Value |
| --- | --- |
| Framework preset | **Vite** |
| Build command | `npm run build` |
| Output directory | `dist` |
| Install command | `npm install` (the default) |
| Root directory | repository root |
| Node.js | 20 or newer |

Leave the rest on Vercel’s defaults. `vite` in `package.json` is enough for the preset to be detected, and files in `/api` become serverless functions with no extra config. `vercel.json` only adds a few security headers; it does not set a framework, build, or output directory.

No environment variables are required.

The Open Graph tags point at `https://acs-epseen.vercel.app/og.jpg` so a WhatsApp preview has a title and image. If the production domain is different, update the `og:url` and `og:image` URLs in `index.html`.

## Fonts

Cormorant Garamond, Great Vibes, and Source Serif 4 are bundled with [@fontsource](https://fontsource.org/) under the SIL Open Font License.
