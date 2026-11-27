import { dbConnect } from '@/lib/db/connect';
import Course from '@/models/Course';
import { isPromotionActive } from '@/lib/format';
import { MailIcon, PhoneIcon } from '@/components/public/icons';
import { PUBLIC_EMAIL, PUBLIC_PHONE, PUBLIC_PHONE_TEL } from '@/lib/public-contact';
import { QuotationForm } from './quotation-form';

export const dynamic = 'force-dynamic';
// The confirm server action on this page schedules the quotation email with
// after(), which renders the PDF with Chromium; on Vercel after() runs within
// this page's max duration (server actions inherit the page's limit).
export const maxDuration = 60;

export const metadata = {
  title: 'ขอใบเสนอราคา — 9Expert',
  description: 'ขอใบเสนอราคาหลักสูตรออนไลน์ของ 9Expert',
};

export default async function PublicQuotationPage() {
  await dbConnect();

  // Only priced courses: a course whose sellPrice is still 0 would produce a
  // 0-baht quotation. buildQuotationDraft() rejects those server-side too.
  const docs = await Course.find({ isActive: true, sellPrice: { $gt: 0 } })
    .sort({ sortOrder: 1, courseName: 1 })
    .lean();

  // Hand the client only plain, serialisable fields — never the raw lean doc
  // (ObjectId and Date instances do not cross the server/client boundary).
  const courses = docs.map((c) => ({
    id: String(c._id),
    courseCode: c.courseCode || '',
    courseName: c.courseName || '',
    coverUrl: c.coverUrl || '',
    price: c.price ?? 0,
    sellPrice: c.sellPrice ?? 0,
    notes: c.notes || '',
    // Promotion state is resolved HERE, on the server. isPromotionActive() is
    // time-dependent, so evaluating it during client render would produce a
    // hydration mismatch whenever the browser clock disagrees with the server —
    // and near midnight in Bangkok the two genuinely disagree.
    isPromoActive: isPromotionActive(c),
  }));

  if (courses.length === 0) {
    return (
      <div className="mx-auto max-w-[720px] px-4 py-10 lg:py-16">
        <section className="rounded-2xl border border-[var(--surface-border)] bg-white px-6 py-10 text-center lg:px-10 lg:py-14">
          <span className="font-en inline-block rounded-full bg-[var(--brand-tint)] px-3 py-1 text-xs font-bold tracking-wider text-[var(--9e-action)]">
            ONLINE VIDEO COURSE
          </span>
          <h1 className="font-thai mt-4 text-2xl font-bold text-[var(--text-primary)]">
            ขณะนี้ยังไม่มีหลักสูตรเปิดให้ขอใบเสนอราคา
          </h1>
          <p className="mt-2 text-sm text-[var(--text-secondary)]">
            กรุณาติดต่อเจ้าหน้าที่เพื่อขอใบเสนอราคา
          </p>
          <div className="mt-6 flex flex-col items-center justify-center gap-3 text-sm sm:flex-row sm:gap-6">
            <a href={PUBLIC_PHONE_TEL} className="flex items-center gap-2 font-medium text-[var(--9e-action)] hover:underline">
              <PhoneIcon className="h-[18px] w-[18px]" />
              {PUBLIC_PHONE}
            </a>
            <a href={`mailto:${PUBLIC_EMAIL}`} className="flex items-center gap-2 font-medium text-[var(--9e-action)] hover:underline">
              <MailIcon className="h-[18px] w-[18px]" />
              {PUBLIC_EMAIL}
            </a>
          </div>
        </section>
      </div>
    );
  }

  return <QuotationForm courses={courses} />;
}
