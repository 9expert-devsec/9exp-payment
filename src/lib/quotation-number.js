import { dbConnect } from './db/connect.js';
import Counter from '../models/Counter.js';

/**
 * Quotation number generator.
 *
 * Format (matches the legacy system exactly for accounting continuity):
 *   QE + <2-digit Buddhist year> + <2-digit month> + <3-digit running number>
 * The running number resets each month. e.g. first quotation of July 2026:
 *   Buddhist year 2569 -> "69", month "07", seq 1 -> "QE6907001".
 *
 * WHY THIS EXISTS / the bug it fixes: the legacy PHP did read-max-then-add-one
 * ("SELECT ... ORDER BY id DESC" then `$max + 1`), a read-modify-write race.
 * Two simultaneous submissions read the same max and produced the SAME number.
 * Here a single atomic $inc on the Counter collection makes that impossible.
 */

/**
 * Derive the Buddhist 2-digit year and 2-digit month in the Asia/Bangkok
 * timezone. This must NOT use bare getMonth()/getFullYear(): Vercel Lambdas run
 * in UTC, so e.g. 06:30 on the 1st in Bangkok is still the previous day/month in
 * UTC and would land in the wrong monthly period.
 */
function bangkokPeriod(date) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Bangkok',
    year: 'numeric',
    month: '2-digit',
  }).formatToParts(date);

  const gregorianYear = Number(parts.find((p) => p.type === 'year').value);
  const month = parts.find((p) => p.type === 'month').value; // already 2-digit
  const buddhistYear2 = String(gregorianYear + 543).slice(-2);
  return { buddhistYear2, month };
}

/** Build the monthly period key, e.g. "QE6907". */
export function periodKey(date = new Date()) {
  const { buddhistYear2, month } = bangkokPeriod(date);
  return `QE${buddhistYear2}${month}`;
}

/**
 * Format a full quotation number from a period key and sequence.
 * The running number is zero-padded to 3 digits. If seq ever exceeds 999 in a
 * single month, we WIDEN the padding (e.g. "1000") rather than throw: halting
 * quotation issuance mid-month is worse than a 4-digit suffix, and the atomic
 * $inc guarantees the numbers stay unique and monotonic at any width, so there
 * is no risk of a duplicate-looking truncation.
 */
export function formatQuotationNo(key, seq) {
  return `${key}${String(seq).padStart(3, '0')}`;
}

/**
 * Atomically reserve and return the next quotation number for `date`'s month.
 * Single findOneAndUpdate with $inc + upsert — race-free.
 */
export async function nextQuotationNo(date = new Date()) {
  await dbConnect();
  const key = periodKey(date);

  // $inc creates seq=1 on the upsert insert, so we do NOT set a default for seq
  // here (a default:0 + $inc:1 on the same path would conflict).
  //
  // One nuance under heavy concurrency: when the month's counter doc does not
  // exist yet, several simultaneous upserts can all attempt the FIRST insert;
  // MongoDB lets exactly one win and raises a duplicate-key error (11000) on the
  // unique _id for the others. That is not a lost update — the doc now exists,
  // so we simply retry and the call becomes a plain atomic $inc. The sequence
  // stays gap-free and unique.
  let lastErr;
  for (let attempt = 0; attempt < 5; attempt++) {
    try {
      const counter = await Counter.findOneAndUpdate(
        { _id: key },
        { $inc: { seq: 1 } },
        { upsert: true, returnDocument: 'after' }
      );
      return formatQuotationNo(key, counter.seq);
    } catch (err) {
      if (err?.code === 11000) {
        lastErr = err;
        continue;
      }
      throw err;
    }
  }
  throw lastErr;
}
