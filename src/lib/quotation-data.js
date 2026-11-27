import { formatMoney, formatBuddhistDate } from './format.js';
import { bahtText } from './baht-text.js';

/**
 * Maps a persisted Quotation document to the exact shape src/lib/quotation-html.js
 * consumes. That template's contract is FIXED — it reads a specific set of paths
 * and nothing else. Do not add, rename, or restructure fields here without
 * changing the template in the same commit.
 *
 * The money fields (`unitPrice`, `amount`, `vat`, `netTotal`) are PRE-FORMATTED
 * STRINGS ("4,205.61"), not numbers. The template interpolates them raw, so
 * handing it a Number would render "4205.61" and silently lose the thousands
 * separator on an accounting document.
 *
 * `item.promotion` is either null (no promotion block is printed) or an object
 * of PRE-FORMATTED STRINGS:
 *   { listPrice: "5,000.00", sellPrice: "4,500.00", dateRange: "1–31 ธันวาคม 2569" }
 * It is non-null only when the snapshot says the promotion was active
 * (`course.isPromotion === true`) AND the list price exceeds the sell price.
 * `dateRange` is '' when either promotion date is missing (including docs
 * created before the dates were snapshotted); the template then prints only
 * the price lines.
 *
 * The Thai strings below are legally-reviewed accounting boilerplate copied
 * verbatim from reference/9EXPERT-QE6907004.pdf. Do not reword them.
 */

// ---- Static boilerplate (identical on every document) ----

export const COMPANY = {
  name: 'บริษัท นายน์เอ็กซ์เพิร์ท จำกัด',
  addressLines: [
    'เลขที่ 318 อาคารเอเวอร์กรีน เพลส ชั้น 2 ห้อง 2B',
    'ซ.วรฤทธิ์ ถนนพญาไท แขวงถนนเพชรบุรี',
    'เขตราชเทวี กรุงเทพ 10400 สำนักงานใหญ่',
    'โทรศัพท์ 02-219-4304',
  ],
  urls: [
    'http://www.9expert.co.th',
    'https://www.9experttraining.com',
    'https://academy.9experttraining.com',
  ],
  taxId: '0105548019065',
};

export const TERMS = [
  'ยืนราคา 30 วัน',
  'กรณี Online Course จะเริ่มเรียนได้หลังจาก 9Expert ได้รับหลักฐานการชำระพร้อมทั้งยอดเงินเข้าบัญชีแล้วเท่านั้น',
  'ระยะเวลาในการอนุมัติไม่เกิน 3 วันทำการ หลังได้รับหลักฐานการชำระเงิน',
];

export const PAYMENT = {
  lines: [
    'โอนเงินชื่อบัญชี บจก.นายน์เอ็กซ์เพิร์ท',
    'ธนาคารไทยพาณิชย์(SCB) สาขา สยามสแควร์',
    'เลขที่บัญชี 038-458929-7 (หัก ณ ที่จ่าย ระบุ เป็น ค่าอบรมสัมนาหรือค่าบริการ)',
    'กรุณาส่งเอกสารสำเนาใบนำฝากที่อีเมล training@9expert.co.th',
    'โดยระบุ ชื่อผู้เข้าอบรม และ วันที่เริ่มอบรม',
  ],
  vatNotice:
    'รายการสินค้าข้างต้น จะต้องเสียภาษีมูลค่าเพิ่ม (VAT 7%) ตามประมวลรัษฎากร มาตรา 77/2 และ 80/1',
};

export const QUOTED_BY = {
  email: 'training@9expert.co.th',
  tel: '02 2194304',
};

// ---- Document builder ----

/** "First Last", collapsing the gap when either half is missing. */
function fullName(person) {
  return [person?.firstName, person?.lastName].filter(Boolean).join(' ').trim();
}

/**
 * Flatten the invoice address into the single line the template renders.
 * The template has one `ที่อยู่` row, so a multi-line address would overflow
 * the fixed-height cell rather than wrap into it.
 */
function joinAddress(invoice) {
  return [
    invoice?.addressLine,
    invoice?.subDistrict,
    invoice?.district,
    invoice?.province,
    invoice?.postalCode,
  ]
    .map((part) => (part == null ? '' : String(part).trim()))
    .filter(Boolean)
    .join(' ');
}

/**
 * Which email appears in the line item's "อีเมลผู้เข้าอบรม" field.
 * Only a single named attendee can be shown there — the cell holds one address.
 * For multi-seat or not-yet-named bookings, the coordinator is the correct
 * contact, since they are who 9Expert follows up with.
 */
function lineItemEmail(doc) {
  const attendees = doc?.attendees || [];
  if (doc?.attendeesListProvided && attendees.length === 1 && attendees[0]?.email) {
    return attendees[0].email;
  }
  return doc?.coordinator?.email || '';
}

const THAI_MONTHS = [
  'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
  'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม',
];

/** {d, m (1-12), y (Buddhist)} of a date in Asia/Bangkok. */
function bangkokThaiParts(date) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Bangkok',
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
  }).formatToParts(new Date(date));
  const get = (t) => Number(parts.find((p) => p.type === t).value);
  return { d: get('day'), m: get('month'), y: get('year') + 543 };
}

/**
 * Promotion date range in the legacy buildPromotionText() shapes:
 *   same month+year: "1–31 ธันวาคม 2569"
 *   same year:       "15 พฤศจิกายน – 10 ธันวาคม 2569"
 *   different years: "20 ธันวาคม 2569 – 10 มกราคม 2570"
 * Returns '' when either date is missing or invalid.
 */
function promotionDateRange(start, end) {
  if (!start || !end) return '';
  if (Number.isNaN(new Date(start).getTime()) || Number.isNaN(new Date(end).getTime())) {
    return '';
  }
  const s = bangkokThaiParts(start);
  const e = bangkokThaiParts(end);
  const sMonth = THAI_MONTHS[s.m - 1];
  const eMonth = THAI_MONTHS[e.m - 1];
  if (s.y === e.y && s.m === e.m) return `${s.d}–${e.d} ${eMonth} ${e.y}`;
  if (s.y === e.y) return `${s.d} ${sMonth} – ${e.d} ${eMonth} ${e.y}`;
  return `${s.d} ${sMonth} ${s.y} – ${e.d} ${eMonth} ${e.y}`;
}

/** The line item's promotion block data, or null when none is printed. */
function itemPromotion(course) {
  const price = Number(course?.price);
  const sellPrice = Number(course?.sellPrice);
  if (course?.isPromotion !== true || !(price > sellPrice)) return null;
  return {
    listPrice: formatMoney(price),
    sellPrice: formatMoney(sellPrice),
    dateRange: promotionDateRange(course.promotionStart, course.promotionEnd),
  };
}

/**
 * The promotion notice as plain-text lines, for surfaces other than the PDF
 * (the quotation email). '' marks a blank gap between paragraphs. Wording is
 * the legacy notice, identical to the PDF's `.desc-promo` block in
 * src/lib/quotation-html.js (that file keeps its own copy because the document
 * template is frozen); a verification check asserts the two stay identical.
 * Without a date range only the price lines are returned.
 *
 * @param {{listPrice: string, sellPrice: string, dateRange: string} | null} promo
 *        `buildQuotationData(doc).item.promotion`.
 * @returns {string[]}  [] when there is no promotion.
 */
export function promotionLines(promo) {
  if (!promo) return [];
  const lines = [
    'โปรโมชัน',
    `จากราคาปกติ ${promo.listPrice} บาท (รวม VAT 7%)`,
    `เหลือเพียง ${promo.sellPrice} บาท (รวม VAT 7%) ต่อท่าน`,
  ];
  if (promo.dateRange) {
    lines.push(
      '',
      `โปรโมชันนี้สำหรับการชำระเงินภายในวันที่ ${promo.dateRange} เท่านั้น`,
      '',
      'หากชำระเงินหลังจากวันดังกล่าว บริษัทขอสงวนสิทธิ์ในการยกเลิกส่วนลด และคิดค่าบริการตามราคาปกติ'
    );
  }
  return lines;
}

/**
 * Build the template payload for one persisted Quotation.
 *
 * Reads ONLY the stored snapshot (`doc.course`, `doc.pricing`) — never the live
 * Course. That is the whole point of the snapshot: this document must render
 * identically forever, even after the course is repriced or renamed.
 *
 * @param {object} doc  A Quotation document (lean object or Mongoose doc).
 */
export function buildQuotationData(doc) {
  const coordinator = doc?.coordinator || {};
  const invoice = doc?.invoice || {};
  const course = doc?.course || {};
  const pricing = doc?.pricing || {};

  const isCorporate = invoice.type === 'corporate';
  const coordinatorName = fullName(coordinator);

  return {
    company: COMPANY,

    quotationNo: doc?.quotationNo || '',
    date: formatBuddhistDate(doc?.createdAt),

    // A corporate quotation is billed to the company; an individual one to the
    // person who requested it.
    customerName: isCorporate ? invoice.companyName || '' : coordinatorName,
    branch: isCorporate ? invoice.branch || '' : '',
    customerTaxId: invoice.taxId || '',
    address: joinAddress(invoice),
    phone: coordinator.phone || '',
    contact: coordinatorName ? `คุณ ${coordinatorName}` : '',

    // Exactly one line item per document — one quotation covers one course.
    item: {
      no: 1,
      productCode: course.courseCode || '',
      productName: course.courseName || '',
      attendeeEmail: lineItemEmail(doc),
      qty: pricing.seats ?? 0,
      unitPrice: formatMoney(pricing.unitPriceExVat),
      amount: formatMoney(pricing.subtotal),
      promotion: itemPromotion(course),
    },

    amount: formatMoney(pricing.subtotal),
    vat: formatMoney(pricing.vatAmount),
    netTotal: formatMoney(pricing.total),
    bahtText: bahtText(pricing.total),

    terms: TERMS,
    payment: PAYMENT,
    quotedBy: QUOTED_BY,
  };
}
