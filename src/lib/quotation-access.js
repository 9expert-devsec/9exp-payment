import crypto from 'node:crypto';

/**
 * Who may view a quotation (success page and PDF). NODE runtime only.
 *
 * - Any signed-in admin may view every quotation.
 * - Anyone else must present the quotation's own `publicToken` (the `?t=`
 *   query param). The comparison is constant-time.
 * - A document without a `publicToken` is admin-only.
 *
 * @param {object} doc       The Quotation (lean or Mongoose doc).
 * @param {unknown} token    The token the caller presented (untrusted).
 * @param {object|null} session  The auth() session, if any.
 * @returns {boolean}
 */
export function canViewQuotation(doc, token, session) {
  if (session?.user) return true;

  const expected = doc?.publicToken;
  if (typeof expected !== 'string' || expected.length === 0) return false;
  if (typeof token !== 'string') return false;

  const a = Buffer.from(expected, 'utf8');
  const b = Buffer.from(token, 'utf8');
  // timingSafeEqual throws on unequal lengths — check first.
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}
