'use server';

import { headers } from 'next/headers';
import { buildQuotationDraft, createQuotation } from '@/lib/quotation-create';
import { buildQuotationData } from '@/lib/quotation-data';
import { buildQuotationHtml } from '@/lib/quotation-html';
import { periodKey } from '@/lib/quotation-number';
import { bahtText } from '@/lib/baht-text';

/**
 * Best-effort client IP. Vercel sits behind a proxy, so the socket address is
 * the proxy's — x-forwarded-for's FIRST entry is the original client. Stored for
 * abuse triage only; never used for authorisation.
 */
async function clientIp() {
  const h = await headers();
  const forwarded = h.get('x-forwarded-for');
  if (forwarded) return forwarded.split(',')[0].trim();
  return h.get('x-real-ip') || '';
}

/**
 * Create a quotation from the public form.
 *
 * Thin wrapper: the request-bound concern (the client IP) is resolved here, and
 * everything else — validation, the course lookup, pricing, the snapshot and the
 * numbering — lives in src/lib/quotation-create.js so it stays testable without
 * a running server. All of it still runs server-side.
 */
export async function createQuotationAction(values) {
  try {
    const ipAddress = await clientIp();
    return await createQuotation(values, { ipAddress });
  } catch (err) {
    console.error('createQuotationAction failed:', err);
    return { ok: false, error: 'เกิดข้อผิดพลาดในระบบ กรุณาลองใหม่อีกครั้ง' };
  }
}

// The document template prints into an A4 page with @page margins. On screen
// (the review step's iframe) there is no @page, so the same margins are added
// as body padding — the preview then wraps exactly like the PDF does.
const SCREEN_PAGE_STYLE =
  '<style>html{background:#fff}body{padding:8mm 9mm}</style>';

function fullName(person) {
  return [person?.firstName, person?.lastName].filter(Boolean).join(' ').trim();
}

/**
 * Render the review step's preview of the quotation document.
 *
 * Built by the same code that issues the real document (buildQuotationDraft →
 * buildQuotationData → buildQuotationHtml), so what the customer reviews is
 * what they get. It NEVER reserves a quotation number: the number shows as the
 * current monthly prefix + "XXX" (e.g. QE6911XXX).
 *
 * @returns {Promise<{ok: true, html: string, summary: object} | {ok: false, error: string}>}
 */
export async function previewQuotationAction(values) {
  try {
    const built = await buildQuotationDraft(values);
    if (!built.ok) return built;
    const { draft } = built;

    const now = new Date();
    const docData = buildQuotationData({
      ...draft,
      quotationNo: `${periodKey(now)}XXX`,
      createdAt: now,
    });
    const html = buildQuotationHtml(docData).replace(
      '</head>',
      `${SCREEN_PAGE_STYLE}</head>`
    );

    const { course, coordinator, invoice, pricing, attendees } = draft;
    const isCorporate = invoice.type === 'corporate';

    // Plain, serialisable values for the review step's details column.
    const summary = {
      courseName: course.courseName || '',
      sellPrice: course.sellPrice ?? 0,
      seats: pricing.seats,
      subtotal: pricing.subtotal,
      vatAmount: pricing.vatAmount,
      total: pricing.total,
      bahtText: bahtText(pricing.total),
      coordinatorName: fullName(coordinator),
      coordinatorEmail: coordinator.email || '',
      coordinatorPhone: coordinator.phone || '',
      attendeeEmails: attendees.map((a) => a.email).filter(Boolean),
      unnamedCount: Math.max(0, pricing.seats - attendees.length),
      billedTo: isCorporate
        ? [invoice.companyName, invoice.branch ? `(${invoice.branch})` : '']
            .filter(Boolean)
            .join(' ')
        : fullName(coordinator),
      taxId: invoice.taxId || '',
    };

    return { ok: true, html, summary };
  } catch (err) {
    console.error('previewQuotationAction failed:', err);
    return { ok: false, error: 'เกิดข้อผิดพลาดในระบบ กรุณาลองใหม่อีกครั้ง' };
  }
}
