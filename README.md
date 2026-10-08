# URL Journey Lab

Demo site for the talk **"What actually happens between typing a URL and seeing a page?"**
Static pages plus two serverless functions. No build step, no dependencies.

**The idea:** the same site loads faster the second time because steps of the journey are skipped (DNS lookup, connection setup, file downloads). This site lets you see it happen.

## What's inside

| Path | What it shows |
|---|---|
| `/` | Measures its own load (DNS, connect, time to first byte, files from cache vs network) and keeps a history to compare the 1st and 2nd load |
| `/ssr` | **Server-side rendering**: the HTML is built on each request (`api/ssr.js`). View source: the content is there |
| `/csr` | **Client-side rendering**: empty HTML shell, filled in by JavaScript (`assets/csr.js`). View source: nothing |
| `/api/data` | JSON cached at the CDN edge for 30 s: watch `x-vercel-cache` go MISS, then HIT, then STALE |

```
url-journey-demo/
├── index.html        measurement page
├── csr.html          client-rendered page (empty shell)
├── api/ssr.js        server-rendered page (serverless function)
├── api/data.js       JSON endpoint
├── assets/           style.css, app.js, csr.js, logo.svg, hero.svg
└── vercel.json       routes + Cache-Control rules
```

## Run locally

Requires Node.js.

```bash
cd url-journey-demo
npx vercel dev      # then open http://localhost:3000
```

The first run asks you to log in to Vercel (free account) and link the project. Locally there is no CDN: `x-vercel-cache` and `x-vercel-id` do not appear, and the `vercel.json` cache rules are not fully reproduced. Deploy to see the real behavior.

## Deploy on Vercel

**CLI**
```bash
npm i -g vercel
vercel          # preview deployment
vercel --prod   # production
```

**GitHub**: push the folder to a repository, then on vercel.com choose *Add New → Project*, import it, set the framework preset to **Other**, leave build command and output directory empty, and deploy.

## Caching rules (`vercel.json`)

| Resource | Header | Effect |
|---|---|---|
| `/assets/*` | `public, max-age=31536000, immutable` | The browser never asks again: 2nd load comes from disk cache |
| HTML pages | Vercel default for static files | The browser revalidates; if unchanged the server answers `304 Not Modified` with no body |
| `/api/data` | `public, s-maxage=30, stale-while-revalidate=60` | Cached at the CDN edge for 30 s, then served stale while refreshing |

**Gotcha:** assets are cached for a year, so a changed file needs a new URL. This demo adds `?v=1` in the HTML (bump to `?v=2` after editing an asset). Real build tools use hashed file names such as `app.3f9c1a.js`.

## Demo script (about 3 minutes)

1. Open the deployed URL with DevTools → **Network** open, filter set to **All**, *Disable cache* ticked. Hard reload (Ctrl/Cmd + Shift + R). Point out that the document comes first, then the CSS, SVG and JS it triggers, then the API call made by JavaScript.
2. Click the document → **Headers** (`cache-control`, `etag`, `x-vercel-cache`) and **Timing** (DNS, connect, first byte).
3. Untick *Disable cache* and click **Revisit** on the page. Compare: the Size column shows *disk cache*, DNS and connect are 0 ms, the history table fills in.
4. Open `/ssr` and `/csr`, press Ctrl+U on each.
5. Reload `/api/data` several times and watch `x-vercel-cache` and `generatedAt`.

## Verify from the command line

```bash
curl -I https://YOUR-SITE.vercel.app/assets/style.css?v=1   # cache-control: immutable
curl -I https://YOUR-SITE.vercel.app/api/data               # run twice: MISS then HIT
```

## Reading list

**The journey (DNS, request, response, rendering)**
- MDN, How the Web works: https://developer.mozilla.org/en-US/docs/Learn/Getting_started_with_the_web/How_the_Web_works

**Caching and 304 (why the second load is faster)**
- MDN, 304 Not Modified: https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Status/304
- MDN, HTTP conditional requests (ETag, `If-None-Match`): https://developer.mozilla.org/en-US/docs/Web/HTTP/Guides/Conditional_requests

**Server, static or browser rendering (SSR, SSG, CSR)**
- web.dev, Rendering on the Web: https://web.dev/articles/rendering-on-the-web

**CDN and `x-vercel-cache`**
- Vercel, response headers (HIT, MISS, STALE): https://vercel.com/docs/headers/response-headers
- Vercel, cache status: https://vercel.com/docs/caching/cache-status
- Vercel, CDN cache: https://vercel.com/docs/caching/cdn-cache

**Notes on these sources**
- `x-vercel-cache` mainly describes static assets and responses whose `Cache-Control` allows CDN caching (such as `s-maxage`). On dynamic routes it often shows MISS even when another cache layer served the data. That is why `/api/data` sets `s-maxage`.
- DevTools can trigger conditional requests of its own, so a 304 in the Network tab is not always a true reload.
- The Size column labels ("disk cache", "memory cache") and the Performance API used by `assets/app.js` are documented in the Chrome DevTools Network reference and MDN's `PerformanceResourceTiming` page; search those names for the current pages.
