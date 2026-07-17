// Hardcoded quotation data taken verbatim from reference/9EXPERT-QE6907004.pdf.
// This is a Phase 0 spike — every value is fixed so the output is directly
// comparable to the reference. Do not recompute the VAT figures; the sale price
// is VAT-inclusive and these are the numbers the reference actually renders.
export const quotation = {
  // Company (issuer) — static boilerplate, matches the reference header.
  company: {
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
  },

  // Document meta.
  quotationNo: 'QE6907004',
  date: '9/7/2569', // Thai Buddhist year, j/n/Y+543, no leading zeros

  // Customer.
  customerName: 'asdasd',
  branch: 'asdasd',
  customerTaxId: '1234567891234',
  address: 'asdasd',
  phone: '0889432707',
  contact: 'คุณ Test Testkub',

  // Line item (exactly one course per document).
  item: {
    no: 1,
    productCode: 'ONL-TEST',
    productName: 'Test',
    attendeeEmail: 'asas@asd.ocm',
    qty: 1,
    unitPrice: '4,205.61', // ex-VAT unit price
    amount: '4,205.61',
  },

  // Totals (VAT-inclusive model; pre-computed, render as-is).
  amount: '4,205.61',
  vat: '294.39',
  netTotal: '4,500.00',
  bahtText: 'สี่พันห้าร้อยบาทถ้วน',

  // Term & condition list.
  terms: [
    'ยืนราคา 30 วัน',
    'กรณี Online Course จะเริ่มเรียนได้หลังจาก 9Expert ได้รับหลักฐานการชำระพร้อมทั้งยอดเงินเข้าบัญชีแล้วเท่านั้น',
    'ระยะเวลาในการอนุมัติไม่เกิน 3 วันทำการ หลังได้รับหลักฐานการชำระเงิน',
  ],

  // Payment block (static boilerplate).
  payment: {
    lines: [
      'โอนเงินชื่อบัญชี บจก.นายน์เอ็กซ์เพิร์ท',
      'ธนาคารไทยพาณิชย์(SCB) สาขา สยามสแควร์',
      'เลขที่บัญชี 038-458929-7 (หัก ณ ที่จ่าย ระบุ เป็น ค่าอบรมสัมนาหรือค่าบริการ)',
      'กรุณาส่งเอกสารสำเนาใบนำฝากที่อีเมล training@9expert.co.th',
      'โดยระบุ ชื่อผู้เข้าอบรม และ วันที่เริ่มอบรม',
    ],
    vatNotice:
      'รายการสินค้าข้างต้น จะต้องเสียภาษีมูลค่าเพิ่ม (VAT 7%) ตามประมวลรัษฎากร มาตรา 77/2 และ 80/1',
  },

  // Quoted-by block.
  quotedBy: {
    email: 'training@9expert.co.th',
    tel: '02 2194304',
  },
};
