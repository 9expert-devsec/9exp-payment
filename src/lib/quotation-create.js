import mongoose from 'mongoose';
import { dbConnect } from './db/connect.js';
import Course from '../models/Course.js';
import Quotation from '../models/Quotation.js';
import { quotationFormSchema } from './validation/quotation.js';
import { computePricing } from './pricing.js';
import { nextQuotationNo } from './quotation-number.js';
import { isPromotionActive } from './format.js';

/**
 * Core quotation creation. Deliberately framework-free — no next/headers, no
 * 'use server' — so it can be exercised by a plain node script as well as by the
 * server action. The action is a thin wrapper that supplies the request IP.
 *
 * TRUST MODEL: everything here is recomputed from the database. The caller
 * supplies WHO and WHICH COURSE; it does not supply money. No price field is
 * ever read from `values`, so a tampered client cannot move a single satang.
 *
 * @param {object} values      Raw form values (untrusted).
 * @param {object} [options]
 * @param {string} [options.ipAddress]  Client IP, stored for abuse triage only.
 */
export async function createQuotation(values, { ipAddress = '' } = {}) {
  // 1. Validate. A client-side zodResolver pass carries no authority here.
  const parsed = quotationFormSchema.safeParse(values);
  if (!parsed.success) {
    return { ok: false, error: 'ข้อมูลไม่ถูกต้อง กรุณาตรวจสอบอีกครั้ง' };
  }
  const data = parsed.data;

  await dbConnect();

  // 2. Load the course. Guard the id shape first — handing Mongoose a malformed
  //    id throws a CastError rather than returning null.
  if (!mongoose.isValidObjectId(data.courseId)) {
    return { ok: false, error: 'ไม่พบหลักสูตรที่เลือก' };
  }
  const course = await Course.findById(data.courseId).lean();
  if (!course || course.isActive !== true) {
    return { ok: false, error: 'หลักสูตรนี้ไม่เปิดให้ขอใบเสนอราคาแล้ว' };
  }

  // 3. Pricing from the DB course and the validated seat count only.
  const pricing = computePricing(course, data.attendeesCount);

  // 4. Freeze the course into a snapshot — see the comment atop
  //    src/models/Quotation.js. `isPromotion` stores the RESOLVED state (date
  //    window included), not the raw flag, so a document issued during a promo
  //    still says so after the promo's end date has passed.
  const courseSnapshot = {
    msdbId: course.msdbId,
    courseCode: course.courseCode,
    courseName: course.courseName,
    price: course.price,
    sellPrice: course.sellPrice,
    isPromotion: isPromotionActive(course),
    promoNote: course.notes || '',
    notes: course.notes || '',
  };

  const attendees = data.attendeesListProvided
    ? data.attendees.slice(0, data.attendeesCount).map((a) => ({
        firstName: a.firstName,
        lastName: a.lastName,
        email: a.email,
        phone: a.phone,
      }))
    : [];

  // 5. Reserve the number LAST. nextQuotationNo() is an atomic $inc that CANNOT
  //    be rolled back — every call consumes a number permanently. Reserving
  //    before the validation and lookups above would burn numbers on failed
  //    submissions and leave holes in an accounting sequence, which is exactly
  //    the kind of gap an auditor asks about.
  const quotationNo = await nextQuotationNo();

  // 6. Insert immediately after reserving, keeping the reserved-but-unused
  //    window as small as it can be.
  const doc = await Quotation.create({
    quotationNo,
    course: courseSnapshot,
    coordinator: {
      firstName: data.coordinator.firstName,
      lastName: data.coordinator.lastName,
      email: data.coordinator.email,
      phone: data.coordinator.phone,
    },
    attendeesCount: data.attendeesCount,
    attendeesListProvided: data.attendeesListProvided,
    attendees,
    invoice: {
      type: data.invoice.type,
      companyName: data.invoice.companyName,
      branch: data.invoice.branch,
      taxId: data.invoice.taxId,
      addressLine: data.invoice.addressLine,
      subDistrict: data.invoice.subDistrict,
      district: data.invoice.district,
      province: data.invoice.province,
      postalCode: data.invoice.postalCode,
    },
    pricing,
    notes: data.notes || '',
    ipAddress,
  });

  return { ok: true, id: String(doc._id), quotationNo: doc.quotationNo };
}
