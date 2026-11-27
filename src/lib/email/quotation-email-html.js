import { buildQuotationData, COMPANY, promotionLines } from '../quotation-data.js';
import { PUBLIC_EMAIL, PUBLIC_PHONE } from '../public-contact.js';

/**
 * The quotation email, built in code (no Postmark Templates) so it is
 * versioned with the repo.
 *
 * Email-client rules: 600px, table layout, inline styles only, web-safe font
 * stack, light theme. Every dynamic value is HTML-escaped (same rule as the
 * PDF template). Values come from buildQuotationData() — the same payload the
 * PDF uses — so the email and the attachment always agree.
 */

const FONT = "'LINE Seed Sans TH', Tahoma, Arial, sans-serif";
const ACTION = '#005CFF';
const NAVY = '#0D1B2A';
const RED = '#E0001B';
const TEXT = '#0D1B2A';
const MUTED = '#5E6A7E';
const BORDER = '#E3E8EF';
const LABEL_BG = '#F8FAFD';

const PAYMENT_STEPS = [
  'โอนเงินเข้าบัญชี ธนาคารไทยพาณิชย์ (SCB) ประเภทออมทรัพย์ สาขาสยามสแควร์ ชื่อบัญชี "บจก.นายน์เอ็กซ์เพิร์ท" เลขที่บัญชี 038-458929-7',
  'ส่งสำเนาใบนำฝากมาที่ training@9expert.co.th โดยระบุชื่อผู้เข้าอบรม และวันที่เริ่มอบรม',
  'หลังได้รับหลักฐานการชำระเงิน ท่านจะได้รับอีเมลแจ้งรหัสผ่านเพื่อเข้าเรียนที่ https://academy.9experttraining.com (อนุมัติภายใน 3 วันทำการ)',
];
const ONLINE_NOTE =
  'กรณี Online Course จะเริ่มเรียนได้หลังจาก 9Expert ได้รับหลักฐานการชำระพร้อมทั้งยอดเงินเข้าบัญชีแล้วเท่านั้น';
const VAT_LINE =
  'รายการสินค้าข้างต้น จะต้องเสียภาษีมูลค่าเพิ่ม (VAT 7%) ตามประมวลรัษฎากร มาตรา 77/2 และ 80/1';
const WHT_TITLE = 'ข้อมูลสำหรับหักภาษี ณ ที่จ่าย ค่าจ้างเหมางานบริการ อัตราหัก 3%';

/** HTML-escape a dynamic value. null/undefined → ''. */
function esc(value) {
  if (value == null) return '';
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/** Absolute base URL for links/images in the email. No trailing slash. */
export function appBaseUrl() {
  const fromEnv = (process.env.APP_BASE_URL || '').trim().replace(/\/+$/, '');
  if (fromEnv) return fromEnv;
  if (process.env.VERCEL_PROJECT_PRODUCTION_URL) {
    return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`;
  }
  return 'http://localhost:3000';
}

/**
 * Company address for the withholding-tax box, from the COMPANY constants:
 * the address lines joined, without the trailing "สำนักงานใหญ่" marker and
 * without the phone line.
 */
function companyAddress() {
  return COMPANY.addressLines
    .filter((l) => !l.startsWith('โทรศัพท์'))
    .join(' ')
    .replace(/\s*สำนักงานใหญ่$/, '');
}

/**
 * Build the quotation email.
 *
 * @param {object} doc  A persisted Quotation (lean object or Mongoose doc).
 * @param {object} [options]
 * @param {string} [options.baseUrl]  Override for APP_BASE_URL.
 * @param {number} [options.year]     Copyright year (defaults to now).
 * @returns {{subject: string, html: string, text: string}}
 */
export function buildQuotationEmail(doc, { baseUrl = appBaseUrl(), year } = {}) {
  const data = buildQuotationData(doc);
  const coordinator = doc?.coordinator || {};
  const invoice = doc?.invoice || {};
  const isCorporate = invoice.type === 'corporate';
  const courseName = doc?.course?.courseName || '';
  const quotationNo = doc?.quotationNo || '';
  const coordinatorName = [coordinator.firstName, coordinator.lastName]
    .filter(Boolean)
    .join(' ');

  const viewUrl = `${baseUrl}/quotation/${String(doc?._id)}?t=${encodeURIComponent(doc?.publicToken || '')}`;
  const logoUrl = `${baseUrl}/logo-9expert.png`;
  const copyrightYear = year ?? new Date().getFullYear();

  const billedTo = isCorporate
    ? [data.customerName, data.branch ? `(${data.branch})` : ''].filter(Boolean).join(' ')
    : data.customerName;
  const attendeeEmails =
    doc?.attendeesListProvided && Array.isArray(doc?.attendees) && doc.attendees.length
      ? doc.attendees.map((a) => a?.email).filter(Boolean)
      : [];
  const promoLines = promotionLines(data.item.promotion).slice(1); // label carries "โปรโมชัน"
  const notes = (doc?.notes || '').trim();

  const subject = `ใบเสนอราคา ${quotationNo} — ${courseName} | 9Expert Training`;
  const greeting = `เรียน คุณ ${coordinatorName}`;
  const intro = `ขอบคุณที่สนใจหลักสูตรออนไลน์ของ 9Expert Training ทางบริษัทได้แนบใบเสนอราคาเลขที่ ${quotationNo} หลักสูตร ${courseName} มากับอีเมลฉบับนี้แล้ว (ไฟล์ PDF)`;
  const footerContact = `หากไม่พบอีเมลในกล่องจดหมาย กรุณาตรวจสอบใน Junk / Spam · สอบถามเพิ่มเติม ${PUBLIC_PHONE} · ${PUBLIC_EMAIL}`;
  const copyright = `Copyright © ${copyrightYear} 9Expert Co., Ltd. All rights reserved.`;

  // Summary rows: [label, lines[]]. Each line is plain text (escaped on output).
  const rows = [
    ['เลขที่ใบเสนอราคา', [quotationNo]],
    ['วันที่', [data.date]],
    ['หลักสูตร', [courseName]],
    ['จำนวน', [`${data.item.qty} ท่าน`]],
    ['ยอดเงินสุทธิ', [`${data.netTotal} บาท (รวม VAT 7%)`]],
    ['ออกในนาม', [billedTo || '—']],
    ['เลขประจำตัวผู้เสียภาษี', [data.customerTaxId || '—']],
    ['อีเมลผู้เรียน', attendeeEmails.length ? attendeeEmails : ['ยังไม่ระบุ — แจ้งภายหลังได้']],
  ];
  if (notes) rows.push(['หมายเหตุ', notes.split(/\r?\n/)]);
  if (promoLines.length) rows.push(['โปรโมชัน', promoLines]);

  // ---------------- HTML ----------------
  const p = (content, style = '') =>
    `<p style="margin:0 0 16px 0;font-family:${FONT};font-size:15px;line-height:1.6;color:${TEXT};${style}">${content}</p>`;

  const summaryHtml = rows
    .map(([label, lines], i) => {
      const isPromo = label === 'โปรโมชัน';
      const value = lines
        .map((l) => (l === '' ? '<div style="height:8px;line-height:8px;">&nbsp;</div>' : `<div>${esc(l)}</div>`))
        .join('');
      const top = i === 0 ? '' : `border-top:1px solid ${BORDER};`;
      return `<tr>
          <td width="170" valign="top" style="${top}background:${LABEL_BG};padding:10px 14px;font-family:${FONT};font-size:14px;line-height:1.5;color:${MUTED};">${esc(label)}</td>
          <td valign="top" style="${top}padding:10px 14px;font-family:${FONT};font-size:14px;line-height:1.5;color:${isPromo ? '#C0392B' : TEXT};${label === 'ยอดเงินสุทธิ' ? 'font-weight:bold;' : ''}">${value}</td>
        </tr>`;
    })
    .join('');

  const stepsHtml = PAYMENT_STEPS.map(
    (s, i) => `<tr>
        <td width="28" valign="top" style="padding:0 0 10px 0;font-family:${FONT};font-size:15px;line-height:1.6;color:${ACTION};font-weight:bold;">${i + 1}.</td>
        <td valign="top" style="padding:0 0 10px 0;font-family:${FONT};font-size:15px;line-height:1.6;color:${TEXT};">${esc(s)}</td>
      </tr>`
  ).join('');

  const html = `<!DOCTYPE html>
<html lang="th">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<meta name="color-scheme" content="light" />
<meta name="supported-color-schemes" content="light" />
<title>${esc(subject)}</title>
</head>
<body style="margin:0;padding:0;background:#F3F6FB;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#F3F6FB;">
  <tr>
    <td align="center" style="padding:24px 12px;">
      <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="width:600px;max-width:600px;background:#FFFFFF;border:1px solid ${BORDER};border-radius:12px;">
        <tr>
          <td style="padding:24px 32px;border-bottom:1px solid ${BORDER};background:#FFFFFF;border-radius:12px 12px 0 0;">
            <img src="${esc(logoUrl)}" width="120" alt="9Expert Training" style="display:block;width:120px;height:auto;border:0;outline:none;text-decoration:none;" />
          </td>
        </tr>
        <tr>
          <td style="padding:28px 32px 8px 32px;">
            <h1 style="margin:0 0 20px 0;font-family:${FONT};font-size:20px;line-height:1.4;color:${NAVY};font-weight:bold;">ใบเสนอราคา ${esc(quotationNo)}</h1>
            ${p(esc(greeting))}
            ${p(esc(intro))}
            <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:4px 0 24px 0;">
              <tr>
                <td align="center" bgcolor="${ACTION}" style="border-radius:10px;">
                  <a href="${esc(viewUrl)}" target="_blank" style="display:inline-block;padding:14px 28px;font-family:${FONT};font-size:16px;font-weight:bold;color:#FFFFFF;text-decoration:none;border-radius:10px;">เปิดใบเสนอราคา</a>
                </td>
              </tr>
            </table>
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border:1px solid ${BORDER};border-radius:8px;border-collapse:separate;margin:0 0 28px 0;">
              ${summaryHtml}
            </table>
            <h2 style="margin:0 0 12px 0;font-family:${FONT};font-size:17px;line-height:1.4;color:${NAVY};font-weight:bold;">ขั้นตอนการชำระเงิน</h2>
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 8px 0;">
              ${stepsHtml}
            </table>
            ${p(esc(ONLINE_NOTE))}
            ${p(esc(VAT_LINE), `color:${RED};`)}
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:8px 0 24px 0;border:1px solid ${BORDER};border-radius:8px;background:${LABEL_BG};border-collapse:separate;">
              <tr>
                <td style="padding:16px 18px;font-family:${FONT};font-size:14px;line-height:1.6;color:${TEXT};">
                  <div style="font-weight:bold;color:${NAVY};margin:0 0 6px 0;">${esc(WHT_TITLE)}</div>
                  <div>${esc(COMPANY.name)}</div>
                  <div>${esc(companyAddress())}</div>
                  <div>เลขประจำตัวผู้เสียภาษี ${esc(COMPANY.taxId)}</div>
                </td>
              </tr>
            </table>
            ${p(esc(footerContact), `font-size:13px;color:${MUTED};`)}
          </td>
        </tr>
        <tr>
          <td style="padding:16px 32px;border-top:1px solid ${BORDER};background:${LABEL_BG};border-radius:0 0 12px 12px;font-family:${FONT};font-size:12px;line-height:1.5;color:${MUTED};text-align:center;">${esc(copyright)}</td>
        </tr>
      </table>
    </td>
  </tr>
</table>
</body>
</html>`;

  // ---------------- Plain text ----------------
  const textRows = rows
    .map(([label, lines]) => {
      const body = lines.filter((l) => l !== '');
      return body.length > 1
        ? `${label}:\n${body.map((l) => `  ${l}`).join('\n')}`
        : `${label}: ${body[0] ?? ''}`;
    })
    .join('\n');

  const text = [
    greeting,
    '',
    intro,
    '',
    `เปิดใบเสนอราคา: ${viewUrl}`,
    '',
    textRows,
    '',
    'ขั้นตอนการชำระเงิน',
    ...PAYMENT_STEPS.map((s, i) => `${i + 1}. ${s}`),
    '',
    ONLINE_NOTE,
    VAT_LINE,
    '',
    WHT_TITLE,
    COMPANY.name,
    companyAddress(),
    `เลขประจำตัวผู้เสียภาษี ${COMPANY.taxId}`,
    '',
    footerContact,
    '',
    copyright,
  ].join('\n');

  return { subject, html, text };
}
