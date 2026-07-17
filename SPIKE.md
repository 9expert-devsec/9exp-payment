# Phase 0 — PDF Generation Spike (results)

**Question:** Can we generate the 9Expert quotation PDF — Thai-correct, pixel-comparable —
from a Next.js route on Vercel?

**Answer so far:** Yes, locally. Puppeteer + Chromium renders DB Heavent Thai correctly
and produces a single-page A4 that a Thai reader recognizes as the same document.
The deployed Vercel measurements still need to be taken (see below).

## What was built

- `src/app/api/pdf/route.js` — Node runtime route, returns `application/pdf`.
  Branches on `process.env.VERCEL`: `puppeteer-core` + `@sparticuz/chromium` on Vercel,
  full `puppeteer` locally.
- `src/lib/quotation-html.js` — the HTML/CSS template (nested tables, mirrors mPDF output).
- `src/lib/assets.js` — inlines both DB Heavent fonts + logo as base64 data URIs
  (no system fonts, no runtime font fetches).
- `src/lib/quotation-data.js` — hardcoded values from the reference PDF.
- `next.config.mjs` — `serverExternalPackages` + `outputFileTracingIncludes` (bundles fonts/imgs).
- `vercel.json` — `maxDuration: 60` for the PDF function.

## Deliverables

| # | Deliverable | Result |
|---|-------------|--------|
| 1 | Generates locally | ✅ 315,711-byte single-page A4 PDF, `%PDF-1.4` |
| 2 | Generates on deployed Vercel URL | ⏳ needs a deploy (steps below) |
| 3 | Thai rendering correct | ✅ `ผู้เข้าอบรม`, `ใบเสนอราคา`, red VAT line — vowels/tone marks stack correctly |
| 4 | Serverless function size | ⏳ read from Vercel build log |
| 5 | Cold start | ⏳ measure first request after deploy |
| 6 | Warm response | ⏳ measure subsequent requests |
| 7 | Verdict | **Proceed with Puppeteer** (pending deploy confirmation) |

## Remaining: deploy + measure (2, 4, 5, 6)

Requires a Vercel account/token — done by the developer, not committed here.

1. Deploy a preview: `vercel` (or push the branch to a Vercel-connected repo).
2. Open `https://<preview>.vercel.app/api/pdf` — deliverable **2**.
3. Function size — deliverable **4** — from the build log line for `api/pdf`
   (limit: 250 MB uncompressed / 50 MB compressed; `@sparticuz/chromium` runs close to it).
4. Cold start — deliverable **5** — time the first request after deploy:
   `curl -s -o out.pdf -w "%{time_total}s\n" https://<preview>.vercel.app/api/pdf`
5. Warm — deliverable **6** — repeat the curl 2–3 more times.

## Known risk to watch on deploy

`puppeteer-core@25.3.0` pins Chrome **150**; `@sparticuz/chromium@149` is the latest published
(Chromium **149**) — a one-major skew. `launch` + `page.pdf` use stable CDP and this pairing is
expected to work. If the deployed function throws a CDP/protocol error at launch, either bump
`@sparticuz/chromium` once a 150.x is published, or pin `puppeteer-core` down to the 24.x line
whose bundled Chrome matches 149.
