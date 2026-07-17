/**
 * MSDB (master-data) API client.
 *
 * MSDB at AI_API_BASE is the upstream catalogue and is STRICTLY READ-ONLY.
 * This app must never POST/PUT/PATCH/DELETE to it. This file is the ONLY place
 * that talks to upstream directly.
 */

const AI_API_BASE = process.env.AI_API_BASE || 'https://9exp-sec.com/api/ai';

/**
 * Fetch a path from MSDB.
 * @param {string} path            e.g. "/online-course"
 * @param {object} [opts]
 * @param {object} [opts.params]   query params, appended to the URL
 * @param {number} [opts.revalidate] Next.js cache revalidate seconds
 * @param {string[]} [opts.tags]   Next.js cache tags
 * @returns {Promise<any>} parsed JSON body
 */
export async function aiFetch(path, { params, revalidate, tags } = {}) {
  const url = new URL(`${AI_API_BASE}${path}`);
  if (params) {
    for (const [k, v] of Object.entries(params)) {
      if (v !== undefined && v !== null) url.searchParams.set(k, String(v));
    }
  }

  const apiKey = process.env.AI_API_KEY;
  const nextOpts = {};
  if (revalidate !== undefined) nextOpts.revalidate = revalidate;
  if (tags !== undefined) nextOpts.tags = tags;

  let res;
  try {
    res = await fetch(url, {
      method: 'GET',
      headers: {
        'x-api-key': apiKey || '',
        accept: 'application/json',
      },
      // 10s cap so a stalled upstream can't hang the Lambda for its full budget.
      signal: AbortSignal.timeout(10000),
      ...(Object.keys(nextOpts).length ? { next: nextOpts } : {}),
    });
  } catch (err) {
    if (err?.name === 'TimeoutError') {
      throw new Error(`MSDB request timed out after 10s: GET ${path}`);
    }
    throw new Error(`MSDB request failed: GET ${path} — ${err?.message || err}`);
  }

  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(
      `MSDB returned ${res.status} ${res.statusText} for GET ${path}` +
        (body ? ` — ${body.slice(0, 300)}` : '')
    );
  }

  return res.json();
}

/**
 * Normalize MSDB's two envelope variants into { items, total }:
 *   - paginated: { ok, total, page, limit, items }
 *   - canonical: { ok, summary: { total }, items }
 */
export function unwrap(response) {
  const items = Array.isArray(response?.items) ? response.items : [];
  const total =
    typeof response?.total === 'number'
      ? response.total
      : typeof response?.summary?.total === 'number'
        ? response.summary.total
        : items.length;
  return { items, total };
}
