import mongoose from 'mongoose';
import { dbConnect } from '../db/connect.js';
import Quotation from '../../models/Quotation.js';

/** Minimum gap between any two send attempts for one quotation. */
export const RESEND_SPACING_MS = 120 * 1000;

/** Resends a customer may request from the success page, per quotation. */
export const CUSTOMER_RESEND_CAP = 3;

/**
 * Atomically claim a resend slot. A single conditional update checks the
 * spacing (and, for customers, the cap) AND records the claim, so two rapid
 * clicks — or two tabs — cannot both pass the check.
 *
 * @param {string} id  Quotation id (already authorised by the caller).
 * @param {{customer: boolean}} options  `true` also enforces and counts the cap.
 * @returns {Promise<{ok: true} | {ok: false, code: 'wait' | 'limit' | 'not-found'}>}
 */
export async function reserveResend(id, { customer }) {
  if (!mongoose.isValidObjectId(id)) return { ok: false, code: 'not-found' };
  await dbConnect();

  const now = new Date();
  const cutoff = new Date(now.getTime() - RESEND_SPACING_MS);
  const filter = {
    _id: id,
    $or: [{ lastEmailAttemptAt: null }, { lastEmailAttemptAt: { $lte: cutoff } }],
  };
  const update = { $set: { lastEmailAttemptAt: now } };
  if (customer) {
    filter.customerResendCount = { $not: { $gte: CUSTOMER_RESEND_CAP } };
    update.$inc = { customerResendCount: 1 };
  }

  const claimed = await Quotation.findOneAndUpdate(filter, update, {
    projection: { _id: 1 },
  }).lean();
  if (claimed) return { ok: true };

  // Work out which rule refused it (the cap wins: it is the final answer).
  const doc = await Quotation.findById(id, {
    customerResendCount: 1,
    lastEmailAttemptAt: 1,
  }).lean();
  if (!doc) return { ok: false, code: 'not-found' };
  if (customer && (doc.customerResendCount || 0) >= CUSTOMER_RESEND_CAP) {
    return { ok: false, code: 'limit' };
  }
  return { ok: false, code: 'wait' };
}
