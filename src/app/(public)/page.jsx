import { dbConnect } from '@/lib/db/connect';
import Course from '@/models/Course';
import { isPromotionActive } from '@/lib/format';
import { Card } from '@/components/ui/card';
import { QuotationForm } from './quotation-form';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'ขอใบเสนอราคา — 9Expert',
  description: 'ขอใบเสนอราคาหลักสูตรออนไลน์ของ 9Expert',
};

export default async function PublicQuotationPage() {
  await dbConnect();

  const docs = await Course.find({ isActive: true })
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

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 sm:py-10">
      <div className="mb-6 sm:mb-8">
        <h1 className="text-2xl font-bold text-[var(--text-primary)] sm:text-3xl">
          ขอใบเสนอราคา
        </h1>
        <p className="mt-1.5 text-sm text-[var(--text-secondary)]">
          กรอกข้อมูลด้านล่างเพื่อขอใบเสนอราคาหลักสูตรออนไลน์ ระบบจะออกเลขที่ใบเสนอราคาให้ทันที
        </p>
      </div>

      {courses.length === 0 ? (
        <Card className="p-10 text-center">
          <p className="text-[var(--text-secondary)]">
            ขณะนี้ยังไม่มีหลักสูตรเปิดให้ขอใบเสนอราคา
          </p>
          <p className="mt-1 text-sm text-[var(--text-muted)]">
            กรุณาติดต่อ training@9expert.co.th หรือโทร 02-219-4304
          </p>
        </Card>
      ) : (
        <QuotationForm courses={courses} />
      )}
    </div>
  );
}
