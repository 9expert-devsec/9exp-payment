import mongoose from 'mongoose';
import { dbConnect } from '@/lib/db/connect';
import Quotation from '@/models/Quotation';
import { auth } from '@/lib/auth/options';
import { canViewQuotation } from '@/lib/quotation-access';
import { renderQuotationPdf } from '@/lib/pdf/render-quotation-pdf';

// Chromium cannot run on the Edge runtime — force Node.
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
// Cold starts with Chromium are slow; give the function headroom.
// (Mirrored in vercel.json for the deployed function.)
export const maxDuration = 60;

// Every response from this route may describe a customer's document: never
// cache it in a shared cache and never let it be indexed.
const PRIVATE_HEADERS = {
  'Cache-Control': 'private, no-store',
  'X-Robots-Tag': 'noindex',
};

function notFoundResponse() {
  return new Response(JSON.stringify({ error: 'Quotation not found' }), {
    status: 404,
    headers: { 'Content-Type': 'application/json', ...PRIVATE_HEADERS },
  });
}

export async function GET(request, { params }) {
  try {
    const { id } = await params;
    const token = new URL(request.url).searchParams.get('t');

    if (!mongoose.isValidObjectId(id)) return notFoundResponse();

    await dbConnect();
    const doc = await Quotation.findById(id).lean();
    if (!doc) return notFoundResponse();

    // Same 404 as a missing id, so a denial does not confirm the id exists.
    const session = await auth();
    if (!canViewQuotation(doc, token, session)) return notFoundResponse();

    const pdf = await renderQuotationPdf(doc);

    return new Response(pdf, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="9EXPERT-${doc.quotationNo}.pdf"`,
        ...PRIVATE_HEADERS,
      },
    });
  } catch (err) {
    console.error('PDF generation failed:', err);
    return new Response(
      JSON.stringify({ error: 'PDF generation failed', detail: String(err?.message || err) }),
      { status: 500, headers: { 'Content-Type': 'application/json', ...PRIVATE_HEADERS } }
    );
  }
}
