# Phase 0 — PDF Generation Spike (results)

**Question:** Can we generate the 9Expert quotation PDF — Thai-correct, pixel-comparable —
from a Next.js route on Vercel?

**Answer so far:** Yes, locally. Puppeteer + Chromium renders DB Heavent Thai correctly
and produces a single-page A4 that a Thai reader recognizes as the same document.
The deployed Vercel measurements still need to be taken (see below).

## What was built

- `src/app/api/pdf/route.js` — Node runtime route, returns `application/pdf`.
  Branches on `process.env.VERCEL`: `puppeteer-core` + `@sparticuz/chromium-min` (remote pack) on
  Vercel, full `puppeteer` locally. (See Phase 0b below for why `-min`.)
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
| 2 | Generates on deployed Vercel URL | ⏳ needs a re-deploy with the Phase 0b fix (steps below) |
| 3 | Thai rendering correct | ✅ locally; fonts still traced into the Vercel bundle — reconfirm on the deployed PDF |
| 4 | Serverless function size | ⏳ read from Vercel build log (now small — binary is no longer bundled) |
| 5 | Cold start | ⏳ measure first request after deploy (includes ~65MB pack download) |
| 6 | Warm response | ⏳ measure subsequent requests |
| 7 | Verdict | **Proceed with Puppeteer** (pending deploy confirmation) |

## Remaining: deploy + measure (2, 4, 5, 6)

Requires a Vercel account/token — done by the developer, not committed here.

1. Deploy a preview: `vercel` (or push the branch to a Vercel-connected repo).
2. Open `https://<preview>.vercel.app/api/pdf` — deliverable **2**.
3. Function size — deliverable **4** — from the build log line for `api/pdf`
   (limit: 50 MB compressed; now well under it since the Chromium binary is downloaded, not bundled).
4. Cold start — deliverable **5** — time the first request after deploy:
   `curl -s -o out.pdf -w "%{time_total}s\n" https://<preview>.vercel.app/api/pdf`
5. Warm — deliverable **6** — repeat the curl 2–3 more times.

## Phase 0b — Vercel bundler-relocation fix (chromium-min + remote pack)

The first Vercel deploy failed: `The input directory ".../@sparticuz/chromium/bin" does not exist`.
Root cause, confirmed locally by inspecting Next's output file traces
(`.next/server/app/api/pdf/route.js.nft.json`):

- `@sparticuz/chromium` references its ~65MB Brotli binary payload (`bin/*.br`) via a **computed
  runtime path** that no static file-tracer follows. Both the Turbopack **and** the Webpack build
  omit `bin/` from the route trace — so switching bundlers (the "Attempt 2" workaround) does **not**
  fix it here.
- Even if force-included, `bin/chromium.br` alone is **64.8 MB** — already Brotli-compressed, so it
  won't shrink when zipped — which exceeds Vercel's **50 MB compressed** function limit by itself.

**Fix applied: `@sparticuz/chromium-min` + remote pack.** The JS-only `-min` package (67 KB) carries
no binary; Chromium is downloaded to `/tmp` on cold start from a GitHub release pack. This sidesteps
both the tracing problem and the size limit.

Pinning rules (already applied):
- `@sparticuz/chromium-min` is pinned **exact** (`149.0.0`, no caret) so it can't drift from the
  hardcoded pack URL.
- The pack URL version must match that version exactly. Recent releases split the pack **by CPU
  arch**; there is no generic `-pack.tar` for v149. Vercel Lambda is **x86_64**, so the route uses
  `chromium-v149.0.0-pack.x64.tar`. If this project's functions are ever set to **arm64**, switch the
  URL to `-pack.arm64.tar`.

Minor version note (unchanged from Phase 0): `puppeteer-core@25.3.0` targets Chrome 150 while the
pack is Chromium 149 — a one-major skew that `launch` + `page.pdf` tolerate via stable CDP.

### Expect on the first deploy

- **Cold start is slower** than Phase 0: the first invocation after a deploy downloads + decompresses
  the ~65MB pack into `/tmp`. Subsequent invocations reuse `/tmp` and are fast. Report both numbers.
- The function bundle is now small (no binary), so deliverable **4** should be comfortably under 50 MB.
