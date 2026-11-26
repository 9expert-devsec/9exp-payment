import crypto from 'node:crypto';
import mongoose from 'mongoose';
import { dbConnect } from '../lib/db/connect.js';
import Quotation from '../models/Quotation.js';

/**
 * Give every quotation that predates access tokens a `publicToken`.
 *
 *   node --env-file=.env.local src/scripts/backfill-public-token.js --dry-run
 *   node --env-file=.env.local src/scripts/backfill-public-token.js
 *
 * Idempotent: only documents whose publicToken is null or missing are touched,
 * and each update re-checks that condition, so a re-run (or a concurrent
 * creation) never overwrites an existing token.
 */
async function main() {
  const dryRun = process.argv.includes('--dry-run');
  const missing = { $or: [{ publicToken: null }, { publicToken: { $exists: false } }] };

  await dbConnect();

  const docs = await Quotation.find(missing, { _id: 1, quotationNo: 1 })
    .sort({ quotationNo: 1 })
    .lean();

  console.log(`${dryRun ? '[dry-run] would update' : 'Updating'} ${docs.length} quotation(s):`);

  let written = 0;
  for (const doc of docs) {
    if (!dryRun) {
      const res = await Quotation.updateOne(
        { _id: doc._id, ...missing },
        { $set: { publicToken: crypto.randomBytes(16).toString('hex') } }
      );
      written += res.modifiedCount;
    }
    console.log(`  ${doc.quotationNo}`);
  }

  if (!dryRun) console.log(`Done. ${written} document(s) written.`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => mongoose.disconnect());
