/** @type {import('next').NextConfig} */
const nextConfig = {
  reactCompiler: true,
  // Keep chromium-min and puppeteer out of the server bundle / tree-shaking.
  serverExternalPackages: ['@sparticuz/chromium-min', 'puppeteer-core', 'puppeteer'],
  // Force the font + logo assets (read from disk at request time) into the
  // serverless function bundle for the PDF route. Without this, Next's file
  // tracing would omit these root-level files and the fonts would fail silently.
  // The key MUST match the route path exactly. It moved from '/api/pdf' to
  // '/api/pdf/[id]' when the route began taking a quotation id — a stale key
  // fails SILENTLY: the build still succeeds, but the fonts are absent from the
  // Lambda and the PDF renders in a fallback face.
  //
  // Every route that RENDERS a PDF needs this entry (PDFs are now also rendered
  // by server actions: the confirm action emails the PDF, and both resend
  // actions re-render it). Keys are picomatch globs matched against the route
  // path with `contains: true` — so '/' matches EVERY route, which is fine
  // here: the assets are ~450 KB. The explicit keys document the routes that
  // actually need them.
  outputFileTracingIncludes: {
    '/api/pdf/[id]': ['./fonts/**', './imgs/**'],
    '/': ['./fonts/**', './imgs/**'], // hosts the confirm action (after() email)
    '/quotation/[id]': ['./fonts/**', './imgs/**'], // hosts the customer resend
    '/admin/quotations': ['./fonts/**', './imgs/**'], // hosts the admin resend
  },
};

export default nextConfig;
