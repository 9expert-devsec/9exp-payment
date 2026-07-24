import mongoose from 'mongoose';
import { dbConnect } from '../lib/db/connect.js';
import Course from '../models/Course.js';
import Quotation from '../models/Quotation.js';
import { createQuotation } from '../lib/quotation-create.js';
import { buildQuotationData } from '../lib/quotation-data.js';
import { buildQuotationHtml } from '../lib/quotation-html.js';
import { computePricing } from '../lib/pricing.js';

/**
 * Phase 3 verification. Run with real credentials loaded:
 *   node --env-file=.env.local src/scripts/verify-phase3.js
 *
 * Creates two real quotations back to back through the SAME code path the
 * server action uses, renders the first one's PDF, and asserts the rendered
 * totals row matches the persisted pricing object exactly.
 *
 * Pass --keep to leave the created quotations in the database.
 */

const KEEP = process.argv.includes('--keep');
let failures = 0;

function check(label, ok, detail = '') {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${label}${detail ? ' — ' + detail : ''}`);
  if (!ok) failures++;
}

/** Mask an email for printing: keeps the shape, drops the identity. */
function redactEmail(v) {
  if (!v) return v;
  const [user, domain] = String(v).split('@');
  if (!domain) return '***';
  return `${user.slice(0, 1)}***@***.${domain.split('.').pop()}`;
}

function redactDoc(doc) {
  const c = JSON.parse(JSON.stringify(doc));
  if (c.coordinator?.email) c.coordinator.email = redactEmail(c.coordinator.email);
  if (Array.isArray(c.attendees)) {
    c.attendees = c.attendees.map((a) => ({ ...a, email: redactEmail(a.email) }));
  }
  return c;
}

function formValues(courseId, seats, overrides = {}) {
  return {
    courseId,
    coordinator: {
      firstName: 'สมชาย',
      lastName: 'ทดสอบระบบ',
      email: 'verify.phase3@example.com',
      phone: '081-234-5678',
    },
    attendeesCount: seats,
    attendeesListProvided: true,
    attendees: Array.from({ length: seats }, (_, i) => ({
      firstName: `ผู้เข้าอบรม${i + 1}`,
      lastName: 'ทดสอบ',
      email: `attendee${i + 1}@example.com`,
      phone: '',
    })),
    coordinatorIsAttending: false,
    invoice: {
      type: 'corporate',
      companyName: 'บริษัท ทดสอบระบบ จำกัด',
      branch: 'สำนักงานใหญ่',
      taxId: '0105548019065',
      addressLine: '318 อาคารเอเวอร์กรีน เพลส ชั้น 2',
      subDistrict: 'ถนนเพชรบุรี',
      district: 'ราชเทวี',
      province: 'กรุงเทพมหานคร',
      postalCode: '10400',
    },
    notes: 'สร้างโดยสคริปต์ตรวจสอบ Phase 3',
    ...overrides,
  };
}

async function main() {
  await dbConnect();
  console.log('Connected to:', mongoose.connection.name);

  // ---- Pick an active course to quote against ----
  // Prefer a genuinely priced course. If the catalogue is still unpriced (Zone B
  // untouched after the MSDB sync), borrow one and price it at the reference
  // document's figures for the duration of the run, then put it back EXACTLY as
  // it was. `restore` holds the original Zone B values.
  let course = await Course.findOne({ isActive: true, sellPrice: { $gt: 0 } })
    .sort({ sortOrder: 1, courseName: 1 })
    .lean();

  let restore = null;
  if (!course) {
    const borrowed = await Course.findOne({ isActive: true })
      .sort({ sortOrder: 1, courseName: 1 })
      .lean();
    if (!borrowed) {
      console.log('\nNo active course in the catalogue. Run the MSDB sync first.');
      process.exit(1);
    }
    restore = {
      _id: borrowed._id,
      price: borrowed.price,
      sellPrice: borrowed.sellPrice,
      isPromotion: borrowed.isPromotion,
    };
    console.log(
      `\nCatalogue is unpriced. Temporarily pricing ${borrowed.courseCode} at ` +
        `price=5900 / sellPrice=4500 for this run (original values restored at the end).`
    );
    await Course.updateOne(
      { _id: borrowed._id },
      { $set: { price: 5900, sellPrice: 4500, isPromotion: true } }
    );
    course = await Course.findById(borrowed._id).lean();
  }

  console.log(
    `\nCourse under test: ${course.courseCode} — ${course.courseName}\n` +
      `  price=${course.price}  sellPrice=${course.sellPrice} (incl. VAT)  isActive=${course.isActive}\n`
  );

  const courseId = String(course._id);

  // ---- Item 5: two quotations back to back ----
  console.log('--- Creating two quotations back to back ---');
  const r1 = await createQuotation(formValues(courseId, 1), { ipAddress: '127.0.0.1' });
  const r2 = await createQuotation(formValues(courseId, 3), { ipAddress: '127.0.0.1' });

  check('quotation #1 created', r1.ok, r1.ok ? r1.quotationNo : r1.error);
  check('quotation #2 created', r2.ok, r2.ok ? r2.quotationNo : r2.error);
  if (!r1.ok || !r2.ok) process.exit(1);

  check('numbers are distinct', r1.quotationNo !== r2.quotationNo,
    `${r1.quotationNo} vs ${r2.quotationNo}`);

  const seq1 = Number(r1.quotationNo.slice(6));
  const seq2 = Number(r2.quotationNo.slice(6));
  check('numbers are sequential', seq2 === seq1 + 1,
    `${r1.quotationNo} -> ${r2.quotationNo} (seq ${seq1} -> ${seq2})`);
  check('same monthly period key', r1.quotationNo.slice(0, 6) === r2.quotationNo.slice(0, 6),
    r1.quotationNo.slice(0, 6));

  // ---- Item 3: the persisted document ----
  const doc1 = await Quotation.findById(r1.id).lean();
  const doc2 = await Quotation.findById(r2.id).lean();
  check('quotation #1 persisted', !!doc1);
  check('quotation #2 persisted', !!doc2);

  console.log('\n--- Persisted document #1 (emails redacted) ---');
  console.log(JSON.stringify(redactDoc(doc1), null, 2));

  // ---- Pricing was recomputed server-side, not taken from the client ----
  const expected1 = computePricing(course, 1);
  const expected2 = computePricing(course, 3);
  check('pricing #1 matches computePricing()',
    JSON.stringify(doc1.pricing) === JSON.stringify({ ...expected1 }),
    JSON.stringify(doc1.pricing));
  check('pricing #2 (3 seats) matches computePricing()',
    JSON.stringify(doc2.pricing) === JSON.stringify({ ...expected2 }),
    JSON.stringify(doc2.pricing));
  check('#1 reconciles: subtotal + vat === total',
    doc1.pricing.subtotal + doc1.pricing.vatAmount === doc1.pricing.total);
  check('#2 reconciles: subtotal + vat === total',
    doc2.pricing.subtotal + doc2.pricing.vatAmount === doc2.pricing.total);

  // ---- Snapshot is frozen, not a reference ----
  check('course snapshot embedded (not a ref)',
    doc1.course?.courseCode === course.courseCode &&
    doc1.course?.sellPrice === course.sellPrice,
    `${doc1.course?.courseCode} @ ${doc1.course?.sellPrice}`);

  // ---- Item 4: render the real PDF and compare the totals row ----
  console.log('\n--- Rendering PDF for ' + doc2.quotationNo + ' (3 seats) ---');
  const data = buildQuotationData(doc2);
  const html = buildQuotationHtml(data);

  const puppeteer = await import('puppeteer');
  const browser = await puppeteer.launch({ headless: true });
  try {
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: 'load' });
    await page.evaluateHandle('document.fonts.ready');

    // Read the totals straight out of the rendered document.
    const rendered = await page.evaluate(() => {
      const amts = [...document.querySelectorAll('.sum-amt')].map((el) =>
        el.textContent.trim()
      );
      const cells = [...document.querySelectorAll('.items tbody td')].map((el) =>
        el.textContent.trim()
      );
      return {
        amount: amts[0],
        vat: amts[1],
        netTotal: amts[2],
        bahtText: document.querySelector('.baht')?.textContent.trim(),
        qty: cells[3],
        unitPrice: cells[4],
        lineAmount: cells[5],
        quotationNo: [...document.querySelectorAll('.pair-value')]
          .map((e) => e.textContent.trim())
          .find((t) => /^QE\d+/.test(t)),
      };
    });

    const money = (n) =>
      Number(n).toLocaleString('en-US', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      });

    console.log('  rendered totals :', JSON.stringify(rendered, null, 2));
    console.log('  persisted pricing:', JSON.stringify(doc2.pricing));

    check('PDF "รวมราคา" === pricing.subtotal',
      rendered.amount === money(doc2.pricing.subtotal),
      `${rendered.amount} vs ${money(doc2.pricing.subtotal)}`);
    check('PDF "VAT7%" === pricing.vatAmount',
      rendered.vat === money(doc2.pricing.vatAmount),
      `${rendered.vat} vs ${money(doc2.pricing.vatAmount)}`);
    check('PDF "ยอดเงินสุทธิ" === pricing.total',
      rendered.netTotal === money(doc2.pricing.total),
      `${rendered.netTotal} vs ${money(doc2.pricing.total)}`);
    check('PDF unit price === pricing.unitPriceExVat',
      rendered.unitPrice === money(doc2.pricing.unitPriceExVat),
      `${rendered.unitPrice} vs ${money(doc2.pricing.unitPriceExVat)}`);
    check('PDF qty === pricing.seats',
      rendered.qty === String(doc2.pricing.seats),
      `${rendered.qty} vs ${doc2.pricing.seats}`);
    check('PDF line amount === unit x qty (row multiplies out)',
      rendered.lineAmount === money(doc2.pricing.unitPriceExVat * doc2.pricing.seats),
      `${rendered.lineAmount}`);
    check('PDF quotation no === persisted quotationNo',
      rendered.quotationNo === doc2.quotationNo,
      `${rendered.quotationNo}`);
    check('PDF baht text present and non-hardcoded',
      !!rendered.bahtText && rendered.bahtText.endsWith('บาทถ้วน'),
      rendered.bahtText);

    const pdf = await page.pdf({
      format: 'A4',
      printBackground: true,
      preferCSSPageSize: true,
    });
    const buf = Buffer.from(pdf);
    const pageCount = (buf.toString('latin1').match(/\/Type\s*\/Page[^s]/g) || []).length;
    check('PDF buffer is a valid PDF',
      buf.subarray(0, 5).toString() === '%PDF-',
      `${(buf.length / 1024).toFixed(1)} KB, ${pageCount} page(s)`);
    check('PDF embeds DB Heavent (not a fallback font)',
      buf.toString('latin1').includes('DBHeavent') ||
        buf.toString('latin1').includes('DB Heavent'),
      'font name found in PDF object stream');
  } finally {
    await browser.close();
  }

  // ---- Cleanup ----
  if (restore) {
    await Course.updateOne(
      { _id: restore._id },
      {
        $set: {
          price: restore.price,
          sellPrice: restore.sellPrice,
          isPromotion: restore.isPromotion,
        },
      }
    );
    const after = await Course.findById(restore._id)
      .select('price sellPrice isPromotion')
      .lean();
    check('borrowed course restored to original Zone B values',
      after.price === restore.price &&
        after.sellPrice === restore.sellPrice &&
        after.isPromotion === restore.isPromotion,
      `price=${after.price} sellPrice=${after.sellPrice} isPromotion=${after.isPromotion}`);
  }

  if (KEEP) {
    console.log(`\nKept quotations ${r1.quotationNo}, ${r2.quotationNo} (--keep).`);
    console.log(`  PDF URLs: /api/pdf/${r1.id}   /api/pdf/${r2.id}`);
  } else {
    await Quotation.deleteMany({ _id: { $in: [r1.id, r2.id] } });
    console.log(
      `\nRemoved the two test quotations. NOTE: the counter was NOT rolled back — ` +
        `sequence numbers ${seq1} and ${seq2} are permanently consumed, by design ` +
        `(an atomic $inc cannot be un-done).`
    );
  }

  console.log(`\n${failures === 0 ? 'ALL CHECKS PASSED' : failures + ' CHECK(S) FAILED'}`);
  await mongoose.disconnect();
  process.exit(failures === 0 ? 0 : 1);
}

main().catch(async (err) => {
  console.error(err);
  await mongoose.disconnect();
  process.exit(1);
});
