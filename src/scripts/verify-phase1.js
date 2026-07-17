import mongoose from 'mongoose';
import { dbConnect } from '../lib/db/connect.js';
import {
  nextQuotationNo,
  periodKey,
  formatQuotationNo,
} from '../lib/quotation-number.js';
import Counter from '../models/Counter.js';
import Course from '../models/Course.js';
import { syncOnlineCourses } from '../lib/msdb/sync-courses.js';

/**
 * Phase 1 verification. Run with real credentials loaded:
 *   node --env-file=.env.local src/scripts/verify-phase1.js
 *
 * Covers verification items 1-5. Items 6 (401) and 8 (/api/pdf) are HTTP checks
 * — see the commands in the phase report / SPIKE notes.
 */

const CONCURRENCY = 50;
let failures = 0;
function check(label, ok, detail = '') {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${label}${detail ? ' — ' + detail : ''}`);
  if (!ok) failures++;
}

async function main() {
  await dbConnect();

  // --- Item 1: database name is 9exp_payment (not 9exp_genesis) ---
  const dbName = mongoose.connection.name;
  const expected = process.env.MONGODB_DB_NAME || '9exp_payment';
  check(
    `[1] connected DB name is "${expected}"`,
    dbName === expected,
    `mongoose.connection.name = "${dbName}"`
  );

  // --- Item 3: Buddhist year/month + Bangkok-vs-UTC boundary ---
  // 2026-07-31T23:30:00Z is 2026-08-01 06:30 in Bangkok -> must be August (QE6908),
  // NOT July. A naive UTC getMonth() would wrongly say July.
  const boundary = new Date('2026-07-31T23:30:00Z');
  const boundaryKey = periodKey(boundary);
  const naiveUtcMonth = boundary.getUTCMonth() + 1; // 7 (July) — the WRONG answer
  check(
    '[3] Bangkok boundary 2026-07-31T23:30Z -> QE6908 (August)',
    boundaryKey === 'QE6908',
    `periodKey=${boundaryKey}, naive UTC month would be ${String(naiveUtcMonth).padStart(2, '0')}`
  );
  // Normal case: first of July 2026 -> QE6907, BE 2569.
  check(
    '[3] July 2026 -> QE6907',
    periodKey(new Date('2026-07-10T04:00:00Z')) === 'QE6907'
  );
  check(
    '[3] format seq 1 -> QE6907001; seq>999 widens not truncates',
    formatQuotationNo('QE6907', 1) === 'QE6907001' &&
      formatQuotationNo('QE6907', 1000) === 'QE69071000',
    `${formatQuotationNo('QE6907', 1)} / ${formatQuotationNo('QE6907', 1000)}`
  );

  // --- Item 2: atomic concurrency — N concurrent calls -> N distinct numbers ---
  // Use a throwaway future period so real sequences are untouched; clean up after.
  const testDate = new Date('2099-01-15T05:00:00Z');
  const testKey = periodKey(testDate);
  await Counter.deleteOne({ _id: testKey }); // start clean
  const results = await Promise.all(
    Array.from({ length: CONCURRENCY }, () => nextQuotationNo(testDate))
  );
  const unique = new Set(results);
  const suffixes = results
    .map((r) => Number(r.slice(testKey.length)))
    .sort((a, b) => a - b);
  const sequential = suffixes.every((n, i) => n === i + 1);
  const formatOk = results.every((r) =>
    new RegExp(`^${testKey}\\d{3,}$`).test(r)
  );
  check(
    `[2] ${CONCURRENCY} concurrent calls -> ${CONCURRENCY} distinct numbers`,
    unique.size === CONCURRENCY,
    `distinct=${unique.size}`
  );
  check('[2] numbers are sequential 1..N', sequential, `range 1..${suffixes.at(-1)}`);
  check('[2] all match QEyymmNNN format', formatOk, `sample=${results[0]}`);
  await Counter.deleteOne({ _id: testKey }); // cleanup

  // --- Item 4: sync against live MSDB ---
  const sync1 = await syncOnlineCourses();
  check(
    '[4] sync returned courses',
    sync1.total > 0,
    `total=${sync1.total} inserted=${sync1.inserted} updated=${sync1.updated} orphanedLocal=${sync1.orphanedLocal}`
  );

  // --- Item 5: Zone B preservation — PROVE it survives a re-sync ---
  const target = await Course.findOne().sort({ courseCode: 1 });
  if (!target) {
    check('[5] Zone B preservation', false, 'no course found to test');
  } else {
    // Capture originals to restore afterward.
    const orig = {
      price: target.price,
      sellPrice: target.sellPrice,
      isPromotion: target.isPromotion,
      notes: target.notes,
    };
    const marker = {
      price: 1234,
      sellPrice: 4500,
      isPromotion: true,
      notes: 'ZONE-B-PRESERVE-TEST',
    };
    await Course.updateOne({ _id: target._id }, { $set: marker });

    // Re-sync (Zone A refresh) — Zone B must be untouched.
    await syncOnlineCourses();

    const after = await Course.findById(target._id).lean();
    const survived =
      after.price === marker.price &&
      after.sellPrice === marker.sellPrice &&
      after.isPromotion === marker.isPromotion &&
      after.notes === marker.notes;
    check(
      '[5] Zone B (price/sellPrice/isPromotion/notes) survives re-sync',
      survived,
      `after re-sync: price=${after.price} sellPrice=${after.sellPrice} isPromotion=${after.isPromotion} notes="${after.notes}"`
    );
    // Also confirm Zone A was actually refreshed (syncedAt set).
    check('[5] Zone A syncedAt was refreshed', !!after.syncedAt);

    // Restore originals so the test leaves no trace.
    await Course.updateOne({ _id: target._id }, { $set: orig });
  }

  console.log(`\n${failures === 0 ? 'ALL PASS' : failures + ' FAILURE(S)'}`);
  process.exitCode = failures === 0 ? 0 : 1;
}

main()
  .catch((err) => {
    console.error('verify-phase1 error:', err?.message || err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.disconnect();
  });
