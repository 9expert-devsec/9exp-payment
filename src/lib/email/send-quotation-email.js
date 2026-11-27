import mongoose from 'mongoose';
import { ServerClient } from 'postmark';
import { dbConnect } from '../db/connect.js';
import Quotation from '../../models/Quotation.js';
import { renderQuotationPdf } from '../pdf/render-quotation-pdf.js';
import { buildQuotationEmail } from './quotation-email-html.js';

/**
 * Email one quotation's PDF to its coordinator through Postmark. NODE runtime.
 *
 * Contract: NEVER throws, and never logs the PDF bytes or the access token.
 * The outcome is written onto the quotation (emailStatus & co.) and returned.
 * Recipient is ALWAYS the stored coordinator email — no caller can redirect it.
 * No CC/BCC to staff (ruling: the legacy BCC is dropped).
 */

const TRIGGERS = new Set(['create', 'resend-customer', 'resend-admin']);
const MAX_ERROR_LENGTH = 500;

let warnedNoToken = false;

function shortError(err) {
  const msg = String(err?.message || err || 'Unknown error');
  return msg.length > MAX_ERROR_LENGTH ? msg.slice(0, MAX_ERROR_LENGTH) : msg;
}

/**
 * @param {string} quotationId
 * @param {{trigger: 'create'|'resend-customer'|'resend-admin'}} options
 * @returns {Promise<{ok: boolean, status: 'sent'|'failed'|'skipped'|'not-found', messageId?: string}>}
 */
export async function sendQuotationEmail(quotationId, { trigger } = {}) {
  const tag = TRIGGERS.has(trigger) ? trigger : 'create';
  try {
    if (!mongoose.isValidObjectId(quotationId)) return { ok: false, status: 'not-found' };
    await dbConnect();

    const token = process.env.POSTMARK_SERVER_TOKEN;
    if (!token) {
      if (!warnedNoToken) {
        console.warn('POSTMARK_SERVER_TOKEN is not set — quotation emails are skipped.');
        warnedNoToken = true;
      }
      const res = await Quotation.updateOne(
        { _id: quotationId },
        { $set: { emailStatus: 'skipped', emailError: null } }
      );
      return res.matchedCount ? { ok: false, status: 'skipped' } : { ok: false, status: 'not-found' };
    }

    // 1. Load + count the attempt.
    const doc = await Quotation.findByIdAndUpdate(
      quotationId,
      { $inc: { emailAttempts: 1 }, $set: { lastEmailAttemptAt: new Date() } },
      { returnDocument: 'after' }
    ).lean();
    if (!doc) return { ok: false, status: 'not-found' };

    try {
      // 2. Render the same PDF the download route serves.
      const pdf = await renderQuotationPdf(doc);
      const { subject, html, text } = buildQuotationEmail(doc);

      // 3. Send.
      const client = new ServerClient(token);
      const result = await client.sendEmail({
        From: process.env.POSTMARK_FROM,
        To: doc.coordinator.email,
        Subject: subject,
        HtmlBody: html,
        TextBody: text,
        MessageStream: process.env.POSTMARK_MESSAGE_STREAM || 'outbound',
        Tag: 'quotation',
        Metadata: { quotationNo: doc.quotationNo, trigger: tag },
        Attachments: [
          {
            Name: `9EXPERT-${doc.quotationNo}.pdf`,
            Content: pdf.toString('base64'),
            ContentType: 'application/pdf',
            ContentID: null,
          },
        ],
      });

      // 4. Success.
      await Quotation.updateOne(
        { _id: doc._id },
        {
          $set: {
            emailStatus: 'sent',
            emailSentAt: new Date(),
            postmarkMessageId: result?.MessageID || null,
            emailError: null,
          },
        }
      );
      return { ok: true, status: 'sent', messageId: result?.MessageID };
    } catch (err) {
      // 5. Failure — recorded, never rethrown.
      const message = shortError(err);
      console.error(`Quotation email failed (${doc.quotationNo}, ${tag}): ${message}`);
      await Quotation.updateOne(
        { _id: doc._id },
        { $set: { emailStatus: 'failed', emailError: message } }
      );
      return { ok: false, status: 'failed' };
    }
  } catch (err) {
    console.error(`Quotation email failed before sending (${tag}): ${shortError(err)}`);
    return { ok: false, status: 'failed' };
  }
}
