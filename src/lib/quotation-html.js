import { getAssets } from './assets.js';

// Blue used for Thai labels throughout the reference document.
const BLUE = '#0000cc';
const RED = '#e0001b';

// A blue Thai label with a smaller English translation beneath it.
function label(th, en) {
  return `<div class="lbl"><span class="th">${th}</span><span class="en">${en}</span></div>`;
}

// A label/value pair row (label block on the left, value vertically centered).
function pair(th, en, value) {
  return `<tr>
    <td class="pair-label">${label(th, en)}</td>
    <td class="pair-value">${value ?? ''}</td>
  </tr>`;
}

// A centered blue Thai + English column header for the line-items table.
function colHead(th, en) {
  return `<div class="th">${th}</div><div class="en">${en}</div>`;
}

// An inline label: blue Thai followed by black English on the same line
// (used in the footer signature cells, e.g. "ผู้เสนอราคา / Quoted By").
function inlineLabel(th, en) {
  return `<span class="th-inline">${th}</span> <span class="en-inline">${en}</span>`;
}

export function buildQuotationHtml(data) {
  const { logo, fontRegular, fontBold } = getAssets();
  const c = data.company;

  const urls = c.urls
    .map((u) => `<div class="url">${u}</div>`)
    .join('');

  const addressLines = c.addressLines
    .map((l) => `<div>${l}</div>`)
    .join('');

  const terms = data.terms
    .map((t, i) => `<div class="term">${i + 1}. ${t}</div>`)
    .join('');

  const paymentLines = data.payment.lines
    .map((l, i) => `<div class="${i === 0 ? 'bullet' : 'pay-line'}">${l}</div>`)
    .join('');

  return `<!DOCTYPE html>
<html lang="th">
<head>
<meta charset="utf-8" />
<style>
  @font-face {
    font-family: 'DB Heavent';
    font-weight: normal;
    src: url('${fontRegular}') format('truetype');
  }
  @font-face {
    font-family: 'DB Heavent';
    font-weight: bold;
    src: url('${fontBold}') format('truetype');
  }
  @page { size: A4; margin: 8mm 9mm; }

  * { box-sizing: border-box; }
  html, body {
    margin: 0; padding: 0;
    font-family: 'DB Heavent', sans-serif;
    color: #000;
    font-size: 15px;
    line-height: 1.05;
    -webkit-font-smoothing: antialiased;
  }

  table { border-collapse: collapse; width: 100%; }
  .box { border: 1px solid #000; }
  .box td { vertical-align: top; }

  .block { margin-bottom: 6px; }

  /* ---- Header ---- */
  .hdr-left { width: 53%; border-right: 1px solid #000; padding: 8px 10px; }
  .hdr-right { width: 47%; text-align: center; padding: 14px 10px; vertical-align: middle; }
  .hdr-inner { width: 100%; }
  .hdr-logo-cell { width: 168px; vertical-align: top; }
  .hdr-logo-cell img { width: 150px; display: block; }
  .url { color: ${BLUE}; font-size: 12px; line-height: 1.25; }
  .company-cell { padding-left: 6px; vertical-align: top; }
  .company-name { font-weight: bold; font-size: 19px; line-height: 1.1; }
  .company-addr { font-size: 13px; line-height: 1.25; margin-top: 2px; }
  .doc-title { font-size: 30px; line-height: 1.1; }
  .doc-taxid { font-size: 15px; margin-top: 8px; }

  /* ---- Label / value pairs ---- */
  .lbl .th { color: ${BLUE}; font-size: 15px; display: block; line-height: 1.1; }
  .lbl .en { color: #000; font-size: 11px; display: block; line-height: 1.1; }
  .meta td { padding: 0; }
  .meta-col { width: 50%; padding: 10px 12px; vertical-align: top; }
  .meta-col.right { border-left: 1px solid #000; }
  .pairs { width: 100%; }
  .pairs .pair-label { width: 42%; padding: 6px 0; }
  .pairs .pair-value { padding: 6px 0 6px 6px; vertical-align: middle; font-size: 15px; }

  /* ---- Line items ---- */
  .items td, .items th { border: 1px solid #000; }
  .items thead td { text-align: center; padding: 5px 4px; }
  .items thead .th { color: ${BLUE}; font-size: 15px; line-height: 1.1; }
  .items thead .en { color: #000; font-size: 11px; line-height: 1.1; }
  .items tbody td { padding: 6px 6px; height: 168px; }
  .col-no { width: 10%; text-align: center; }
  .col-code { width: 15%; text-align: center; }
  .col-desc { width: 35%; text-align: left; }
  .col-qty { width: 12%; text-align: center; }
  .col-unit { width: 12%; text-align: center; }
  .col-amt { width: 16%; text-align: center; }
  .desc-name { }
  .desc-email { margin-top: 16px; }
  .desc-email b { font-weight: bold; }
  .desc-bullets { margin-top: 16px; }
  .desc-bullets div { line-height: 1.3; }

  /* ---- Totals ---- */
  .totals-left { width: 62%; border-right: 1px solid #000; vertical-align: top; padding: 0; }
  .totals-right { width: 38%; padding: 0; vertical-align: top; }
  .tc-head { font-weight: bold; font-size: 15px; }
  .tc-body { padding: 7px 10px; }
  .term { line-height: 1.3; }
  .baht { padding: 7px 10px; border-top: 1px solid #000; }
  .sum-row td { border-bottom: 1px solid #000; padding: 7px 10px; }
  .sum-row:last-child td { border-bottom: none; }
  .sum-label { color: ${BLUE}; font-size: 15px; }
  .sum-amt { text-align: right; font-size: 15px; white-space: nowrap; }
  .sum-net .sum-label, .sum-net .sum-amt { font-weight: bold; font-size: 17px; }

  /* ---- Footer ---- */
  .pay-left { width: 62%; border-right: 1px solid #000; padding: 7px 10px; vertical-align: top; }
  .pay-head { font-weight: bold; font-size: 15px; margin-bottom: 2px; }
  .bullet { line-height: 1.35; }
  .bullet::before { content: '• '; }
  .pay-line { line-height: 1.35; }
  .vat-notice { color: ${RED}; margin-top: 2px; line-height: 1.3; }
  .sign-right { width: 38%; padding: 0; vertical-align: top; }
  .sign-cell { border-bottom: 1px solid #000; padding: 6px 10px; }
  .sign-cell:last-child { border-bottom: none; }
  .sign-cell .val { font-size: 13px; line-height: 1.3; margin-top: 2px; }
  .th-inline { color: ${BLUE}; font-size: 15px; }
  .en-inline { color: #000; font-size: 13px; }
</style>
</head>
<body>

  <!-- ===== Header ===== -->
  <table class="box block">
    <tr>
      <td class="hdr-left">
        <table class="hdr-inner">
          <tr>
            <td class="hdr-logo-cell">
              <img src="${logo}" alt="9Expert" />
              ${urls}
            </td>
            <td class="company-cell">
              <div class="company-name">${c.name}</div>
              <div class="company-addr">${addressLines}</div>
            </td>
          </tr>
        </table>
      </td>
      <td class="hdr-right">
        <div class="doc-title">ใบเสนอราคา/Quotation</div>
        <div class="doc-taxid">เลขประจำตัวผู้เสียภาษีอากร ${c.taxId}</div>
      </td>
    </tr>
  </table>

  <!-- ===== Customer / meta ===== -->
  <table class="box block meta">
    <tr>
      <td class="meta-col">
        <table class="pairs">
          ${pair('ชื่อลูกค้า', 'Name', data.customerName)}
          ${pair('สาขา', 'Branch', data.branch)}
          ${pair('เลขประจำตัวผู้เสียภาษีอากร', 'TAX ID', data.customerTaxId)}
          ${pair('ที่อยู่', 'Address', data.address)}
          ${pair('เบอร์โทร', 'Phone', data.phone)}
        </table>
      </td>
      <td class="meta-col right">
        <table class="pairs">
          ${pair('วันที่', 'Date', data.date)}
          ${pair('เลขที่ใบเสนอราคา', 'Quotation No.', data.quotationNo)}
          ${pair('ผู้ติดต่อ', 'Contact', data.contact)}
        </table>
      </td>
    </tr>
  </table>

  <!-- ===== Line items ===== -->
  <table class="items block">
    <thead>
      <tr>
        <td class="col-no">${colHead('ลำดับ', 'No.')}</td>
        <td class="col-code">${colHead('รหัส', 'Product Code')}</td>
        <td class="col-desc" style="text-align:center">${colHead('รายละเอียด', 'Description')}</td>
        <td class="col-qty">${colHead('จำนวน', 'Quantity')}</td>
        <td class="col-unit">${colHead('หน่วยละ', 'Unit')}</td>
        <td class="col-amt">${colHead('จำนวนเงิน', 'Amount')}</td>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td class="col-no">${data.item.no}</td>
        <td class="col-code">${data.item.productCode}</td>
        <td class="col-desc">
          <div class="desc-name">${data.item.productName}</div>
          <div class="desc-email"><b>อีเมลผู้เข้าอบรม :</b> ${data.item.attendeeEmail}</div>
          <div class="desc-bullets">
            <div>- ระยะเวลาเรียน 365 วัน นับจากวันที่อนุมัติ</div>
            <div>- เรียนผ่าน https://academy.9experttraining.com</div>
          </div>
        </td>
        <td class="col-qty">${data.item.qty}</td>
        <td class="col-unit">${data.item.unitPrice}</td>
        <td class="col-amt">${data.item.amount}</td>
      </tr>
    </tbody>
  </table>

  <!-- ===== Totals ===== -->
  <table class="box block">
    <tr>
      <td class="totals-left">
        <div class="tc-body">
          <div class="tc-head">Term &amp; Condition :</div>
          ${terms}
        </div>
        <div class="baht">${data.bahtText}</div>
      </td>
      <td class="totals-right">
        <table>
          <tr class="sum-row">
            <td class="sum-label">รวมราคา Amount</td>
            <td class="sum-amt">${data.amount}</td>
          </tr>
          <tr class="sum-row">
            <td class="sum-label">ภาษีมูลค่าเพิ่ม VAT7%</td>
            <td class="sum-amt">${data.vat}</td>
          </tr>
          <tr class="sum-row sum-net">
            <td class="sum-label">ยอดเงินสุทธิ Net Total</td>
            <td class="sum-amt">${data.netTotal}</td>
          </tr>
        </table>
      </td>
    </tr>
  </table>

  <!-- ===== Footer ===== -->
  <table class="box block">
    <tr>
      <td class="pay-left">
        <div class="pay-head">การชำระเงิน</div>
        ${paymentLines}
        <div class="vat-notice">${data.payment.vatNotice}</div>
      </td>
      <td class="sign-right">
        <div class="sign-cell">
          ${inlineLabel('ผู้เสนอราคา', '/ Quoted By')}
          <div class="val">${data.quotedBy.email}<br />Tel : ${data.quotedBy.tel}</div>
        </div>
        <div class="sign-cell">
          ${inlineLabel('วันที่', '/ Date')} ${data.date}
        </div>
        <div class="sign-cell">
          ${inlineLabel('ผู้สั่งซื้อ', '/ Purchase Approve By')}
          <div class="val">&nbsp;</div>
        </div>
        <div class="sign-cell">
          ${inlineLabel('วันที่', '/Date')}
          <div class="val">&nbsp;</div>
        </div>
      </td>
    </tr>
  </table>

</body>
</html>`;
}
