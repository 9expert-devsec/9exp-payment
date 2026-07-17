// Shared display + date helpers for the admin UI.

const BANGKOK = 'Asia/Bangkok';

/** Format a number as #,##0.00 (e.g. 4500 -> "4,500.00"). */
export function formatMoney(n) {
  const value = Number(n) || 0;
  return value.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

/** Extract {y, m, d} for a date in the Asia/Bangkok timezone (numbers). */
function bangkokParts(date) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: BANGKOK,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date);
  const get = (t) => Number(parts.find((p) => p.type === t).value);
  return { y: get('year'), m: get('month'), d: get('day') };
}

/** Comparable YYYYMMDD integer for a date, in Bangkok. */
function bangkokYmdInt(date) {
  const { y, m, d } = bangkokParts(date);
  return y * 10000 + m * 100 + d;
}

/**
 * Buddhist-year date, same format the PDF uses: j/n/(Y+543) with NO leading
 * zeros, computed in Asia/Bangkok. e.g. 2026-07-09 -> "9/7/2569".
 */
export function formatBuddhistDate(date) {
  if (!date) return '';
  const { y, m, d } = bangkokParts(new Date(date));
  return `${d}/${m}/${y + 543}`;
}

/**
 * Whether a course's promotion is currently active.
 * Active if isPromotion === true, OR today (in Bangkok) falls within
 * promotionStart..promotionEnd inclusive. Vercel Lambdas run UTC, so this must
 * be computed in Bangkok — a naive new Date() comparison is wrong near midnight.
 */
export function isPromotionActive(course, now = new Date()) {
  if (course?.isPromotion === true) return true;

  const start = course?.promotionStart;
  const end = course?.promotionEnd;
  if (!start && !end) return false;

  const today = bangkokYmdInt(now);
  const startInt = start ? bangkokYmdInt(new Date(start)) : null;
  const endInt = end ? bangkokYmdInt(new Date(end)) : null;

  if (startInt !== null && today < startInt) return false;
  if (endInt !== null && today > endInt) return false;
  return true;
}
