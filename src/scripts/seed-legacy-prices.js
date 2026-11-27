import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import mongoose from 'mongoose';
import { dbConnect } from '../lib/db/connect.js';
import Course from '../models/Course.js';

/**
 * ONE-OFF: seed course prices from the legacy payment.9expert.co.th price list
 * (snapshot 2026-11-26, VAT-inclusive) in ./data/legacy-prices-2026-11.json.
 *
 *   node --env-file=.env.local src/scripts/seed-legacy-prices.js --db-check
 *   node --env-file=.env.local src/scripts/seed-legacy-prices.js --dry-run
 *   node --env-file=.env.local src/scripts/seed-legacy-prices.js
 *
 *   --db-check  print the database this would use, then exit (reads nothing).
 *   --dry-run   full report, ZERO writes (no write is ever issued).
 *
 * Rules:
 *  - Exact match only, on a normalised courseName (see normaliseName). Never
 *    fuzzy-applied; suggestions for unmatched rows are printed, never written.
 *  - A legacy row matching more than one course — or a course claimed by more
 *    than one row — is AMBIGUOUS and nothing is applied for it.
 *  - Only courses whose sellPrice is 0 or missing are priced; anything already
 *    priced is reported ALREADY-PRICED and left alone (no override flag).
 *  - Writes ONLY `price` and `sellPrice` (list = sell, i.e. no promotion), with
 *    the filter { _id, sellPrice: { $in: [0, null] } } so a concurrent manual
 *    edit is never clobbered. Mongoose's `updatedAt` timestamp also moves.
 *  - Idempotent: a second run finds the matched courses ALREADY-PRICED.
 *
 * One-shot CLI script: it may disconnect at the end (see create-admin.js).
 */

// Never let Mongoose build indexes or create collections from this script.
// Both are on by default and fire on connect — i.e. they would be WRITES even
// in --dry-run against production. A price seed has no business managing
// indexes; the app owns that.
mongoose.set('autoIndex', false);
mongoose.set('autoCreate', false);

const DATA_FILE = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  'data',
  'legacy-prices-2026-11.json'
);

/**
 * Normalise a course name for exact comparison:
 * NFC + trim; whitespace runs → one space; lowercase; – — - → "-" with no
 * spaces around it; "&" → " and "; collapse whitespace again.
 */
export function normaliseName(name) {
  return String(name ?? '')
    .normalize('NFC')
    .trim()
    .replace(/\s+/g, ' ')
    .toLowerCase()
    .replace(/\s*[–—-]\s*/g, '-')
    .replace(/&/g, ' and ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Word tokens for the "closest name" suggestions (display only). */
function tokens(name) {
  return new Set(
    normaliseName(name)
      .split(/[\s-]+/)
      .filter(Boolean)
  );
}

/** Jaccard overlap of two token sets. */
function overlap(a, b) {
  let shared = 0;
  for (const t of a) if (b.has(t)) shared += 1;
  const union = a.size + b.size - shared;
  return union ? shared / union : 0;
}

const isUnpriced = (c) => !(Number(c.sellPrice) > 0);
const money = (n) => (n == null ? '—' : Number(n).toLocaleString('en-US'));
const pad = (s, n) => {
  const str = String(s);
  return str.length >= n ? str : str + ' '.repeat(n - str.length);
};

async function main() {
  const dryRun = process.argv.includes('--dry-run');
  const dbCheck = process.argv.includes('--db-check');

  const conn = await dbConnect();
  const dbName = conn.connection.db.databaseName;
  console.log(`Database: ${dbName}`);
  if (dbCheck) return;
  console.log(`Mode:     ${dryRun ? 'DRY RUN (no writes)' : 'LIVE (writes enabled)'}`);
  console.log(`Data:     ${path.basename(DATA_FILE)}`);
  console.log('');

  const rows = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
  for (const r of rows) {
    if (typeof r.name !== 'string' || !(Number(r.sellPrice) > 0)) {
      throw new Error(`Bad data row: ${JSON.stringify(r)}`);
    }
  }

  const courses = await Course.find(
    {},
    { courseCode: 1, courseName: 1, price: 1, sellPrice: 1, isActive: 1 }
  ).lean();

  // normalised name → courses with that name
  const byName = new Map();
  for (const c of courses) {
    const key = normaliseName(c.courseName);
    if (!byName.has(key)) byName.set(key, []);
    byName.get(key).push(c);
  }

  // 1. Classify each legacy row.
  const results = rows.map((row) => {
    const hits = byName.get(normaliseName(row.name)) || [];
    if (hits.length === 0) return { row, status: 'NO-MATCH' };
    if (hits.length > 1) return { row, status: 'AMBIGUOUS', courses: hits, reason: `${hits.length} courses share this name` };
    const course = hits[0];
    return { row, status: isUnpriced(course) ? 'MATCH' : 'ALREADY-PRICED', course };
  });

  // A course claimed by more than one legacy row is ambiguous too.
  const claims = new Map();
  for (const r of results) {
    if (r.course) claims.set(String(r.course._id), (claims.get(String(r.course._id)) || 0) + 1);
  }
  for (const r of results) {
    if (r.course && claims.get(String(r.course._id)) > 1) {
      r.status = 'AMBIGUOUS';
      r.reason = 'course matched by more than one legacy row';
    }
  }

  // 2. Apply (live only).
  let modified = 0;
  if (!dryRun) {
    for (const r of results.filter((x) => x.status === 'MATCH')) {
      const res = await Course.updateOne(
        { _id: r.course._id, sellPrice: { $in: [0, null] } },
        { $set: { sellPrice: r.row.sellPrice, price: r.row.sellPrice } }
      );
      r.written = res.modifiedCount === 1;
      modified += res.modifiedCount;
    }
  }

  // 3. Report.
  console.log(
    `${pad('STATUS', 15)}${pad('LEGACY NAME', 52)}${pad('COURSE CODE', 22)}${pad('OLD → NEW', 18)}COURSE NAME`
  );
  console.log('-'.repeat(150));
  for (const r of results) {
    const c = r.course;
    const change =
      r.status === 'MATCH'
        ? `${money(c.sellPrice ?? 0)} → ${money(r.row.sellPrice)}`
        : r.status === 'ALREADY-PRICED'
          ? `${money(c.sellPrice)} (kept)`
          : `— (legacy ${money(r.row.sellPrice)})`;
    const code = c ? `${c.courseCode}${c.isActive === false ? ' (inactive)' : ''}` : '—';
    let name = c ? c.courseName : '—';
    if (r.status === 'AMBIGUOUS') {
      name = r.courses
        ? r.courses.map((x) => `${x.courseCode}`).join(', ') + ` — ${r.reason}`
        : `${c.courseName} — ${r.reason}`;
    }
    const flag = !dryRun && r.status === 'MATCH' && !r.written ? '  [NOT WRITTEN: price set concurrently]' : '';
    console.log(`${pad(r.status, 15)}${pad(r.row.name, 52)}${pad(code, 22)}${pad(change, 18)}${name}${flag}`);
  }

  // Active, still-unpriced courses no legacy row priced.
  const pricedIds = new Set(
    results.filter((r) => r.status === 'MATCH').map((r) => String(r.course._id))
  );
  const leftover = courses
    .filter((c) => c.isActive !== false && isUnpriced(c) && !pricedIds.has(String(c._id)))
    .sort((a, b) => a.courseCode.localeCompare(b.courseCode));
  console.log('');
  console.log(`Active courses with price 0 that no legacy row matched (${leftover.length}) — set these by hand:`);
  for (const c of leftover) console.log(`  ${pad(c.courseCode, 24)}${c.courseName}`);
  if (!leftover.length) console.log('  (none)');

  // Suggestions for NO-MATCH rows (display only — never applied).
  const active = courses.filter((c) => c.isActive !== false);
  const noMatch = results.filter((r) => r.status === 'NO-MATCH');
  console.log('');
  console.log(`Suggestions for NO-MATCH rows (closest active names by token overlap — never applied):`);
  if (!noMatch.length) console.log('  (none)');
  for (const r of noMatch) {
    const rt = tokens(r.row.name);
    const best = active
      .map((c) => ({ c, score: overlap(rt, tokens(c.courseName)) }))
      .filter((x) => x.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 2);
    console.log(`  "${r.row.name}"`);
    if (!best.length) console.log('      (no candidate shares a word)');
    for (const { c, score } of best) {
      console.log(
        `      ${score.toFixed(2)}  ${pad(c.courseCode, 24)}${c.courseName}  [current price ${money(c.sellPrice ?? 0)}]`
      );
    }
  }

  // Counts.
  const count = (s) => results.filter((r) => r.status === s).length;
  console.log('');
  console.log(
    `Counts: legacy rows ${results.length} · MATCH ${count('MATCH')} · ALREADY-PRICED ${count('ALREADY-PRICED')} · AMBIGUOUS ${count('AMBIGUOUS')} · NO-MATCH ${count('NO-MATCH')} · unpriced active courses left ${leftover.length}`
  );
  if (dryRun) console.log('DRY RUN — no writes made');
  else console.log(`LIVE — documents modified: ${modified}`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => mongoose.disconnect());
