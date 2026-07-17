import { buildQuotationHtml } from '@/lib/quotation-html';
import { quotation } from '@/lib/quotation-data';

// Chromium cannot run on the Edge runtime — force Node.
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
// Cold starts with Chromium are slow; give the function headroom.
// (Mirrored in vercel.json for the deployed function.)
export const maxDuration = 60;

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

export async function GET() {
  let browser;
  try {
    const html = buildQuotationHtml(quotation);
    browser = await launchBrowser();
    const page = await browser.newPage();
    // waitUntil networkidle0 not needed: all assets are inlined data URIs,
    // but we still wait for fonts to be ready before printing.
    await page.setContent(html, { waitUntil: 'load' });
    await page.evaluateHandle('document.fonts.ready');

    const pdf = await page.pdf({
      format: 'A4',
      printBackground: true,
      preferCSSPageSize: true,
    });

    return new Response(Buffer.from(pdf), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': 'inline; filename="9EXPERT-QE6907004.pdf"',
        'Cache-Control': 'no-store',
      },
    });
  } catch (err) {
    console.error('PDF generation failed:', err);
    return new Response(
      JSON.stringify({ error: 'PDF generation failed', detail: String(err?.message || err) }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  } finally {
    if (browser) await browser.close();
  }
}
