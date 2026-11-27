import { buildQuotationHtml } from '../quotation-html.js';
import { buildQuotationData } from '../quotation-data.js';

/**
 * Quotation PDF renderer (headless Chromium). NODE runtime only.
 *
 * Shared by the PDF route (/api/pdf/[id]) and the email sender, so the
 * downloaded and the emailed PDF are the same document.
 *
 * DEPLOYMENT NOTE: every route that ends up calling this must get the fonts/
 * and imgs/ assets traced into its serverless bundle — see
 * `outputFileTracingIncludes` in next.config.mjs — and enough time to cold-start
 * Chromium (`export const maxDuration = 60` on the route/page segment).
 */

// Chromium binary is NOT bundled. @sparticuz/chromium ships a ~65MB Brotli
// payload in its bin/ dir that (a) no static file-tracer follows into the
// serverless bundle and (b) exceeds Vercel's 50MB compressed function limit on
// its own. So we use @sparticuz/chromium-min (JS only, no binary) and download
// the matching Chromium pack to /tmp on cold start.
//
// IMPORTANT: this URL's version MUST match the exact @sparticuz/chromium-min
// version pinned in package.json. It is pinned (no caret) so the two cannot
// drift. Newer releases split the pack by CPU arch; Vercel Lambda is x86_64.
const CHROMIUM_VERSION = '149.0.0';
const CHROMIUM_PACK_URL = `https://github.com/Sparticuz/chromium/releases/download/v${CHROMIUM_VERSION}/chromium-v${CHROMIUM_VERSION}-pack.x64.tar`;

// Launch a browser. On Vercel we download the Lambda-targeted Chromium via
// @sparticuz/chromium-min + puppeteer-core; locally we use the full puppeteer
// package, which ships its own Chrome. The deployed path is what matters.
async function launchBrowser() {
  if (process.env.VERCEL) {
    const chromium = (await import('@sparticuz/chromium-min')).default;
    const puppeteer = await import('puppeteer-core');
    return puppeteer.launch({
      args: chromium.args,
      defaultViewport: chromium.defaultViewport,
      executablePath: await chromium.executablePath(CHROMIUM_PACK_URL),
      headless: true,
    });
  }
  const puppeteer = await import('puppeteer');
  return puppeteer.launch({ headless: true });
}

/**
 * Render one persisted Quotation to a PDF.
 *
 * Renders purely from the stored snapshot — the live Course is never read, so
 * the document looks the same on every future request.
 *
 * @param {object} doc  A Quotation document (lean object or Mongoose doc).
 * @returns {Promise<Buffer>}
 */
export async function renderQuotationPdf(doc) {
  const html = buildQuotationHtml(buildQuotationData(doc));
  let browser;
  try {
    browser = await launchBrowser();
    const page = await browser.newPage();

    // Lock the page down before loading untrusted-content HTML. Every asset is
    // an inlined data: URI (src/lib/assets.js), so the page never legitimately
    // needs script or the network — any other request is blocked.
    await page.setJavaScriptEnabled(false);
    await page.setRequestInterception(true);
    page.on('request', (req) => {
      if (req.url().startsWith('data:')) req.continue();
      else req.abort();
    });

    // waitUntil networkidle0 not needed: all assets are inlined data URIs,
    // but we still wait for fonts to be ready before printing.
    await page.setContent(html, { waitUntil: 'load' });
    await page.evaluateHandle('document.fonts.ready');

    const pdf = await page.pdf({
      format: 'A4',
      printBackground: true,
      preferCSSPageSize: true,
    });
    return Buffer.from(pdf);
  } finally {
    if (browser) await browser.close();
  }
}
