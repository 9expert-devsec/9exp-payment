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
  outputFileTracingIncludes: {
    '/api/pdf/[id]': ['./fonts/**', './imgs/**'],
  },
};

export default nextConfig;
