import fs from 'node:fs';
import path from 'node:path';

// Read the bundled font + logo files once and cache their base64 data URIs.
// Files live at the repo root (fonts/, imgs/) and are force-included in the
// Vercel serverless bundle via `outputFileTracingIncludes` in next.config.mjs.
let cache = null;

function toDataUri(absPath, mime) {
  const b64 = fs.readFileSync(absPath).toString('base64');
  return `data:${mime};base64,${b64}`;
}

export function getAssets() {
  if (cache) return cache;
  const root = process.cwd();
  cache = {
    fontRegular: toDataUri(
      path.join(root, 'fonts', 'DB Heavent v3.2.1.ttf'),
      'font/ttf'
    ),
    fontBold: toDataUri(
      path.join(root, 'fonts', 'DB Heavent Bd v3.2.1.ttf'),
      'font/ttf'
    ),
    logo: toDataUri(path.join(root, 'imgs', 'logo-9expert.png'), 'image/png'),
  };
  return cache;
}
