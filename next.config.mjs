/** @type {import('next').NextConfig} */
const nextConfig = {
  reactCompiler: true,
  // Keep chromium-min and puppeteer out of the server bundle / tree-shaking.
  serverExternalPackages: ['@sparticuz/chromium-min', 'puppeteer-core', 'puppeteer'],
  // Force the font + logo assets (read from disk at request time) into the
  // serverless function bundle for the PDF route. Without this, Next's file
  // tracing would omit these root-level files and the fonts would fail silently.
  outputFileTracingIncludes: {
    '/api/pdf': ['./fonts/**', './imgs/**'],
  },
};

export default nextConfig;
