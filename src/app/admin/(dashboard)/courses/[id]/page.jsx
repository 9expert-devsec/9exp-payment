import { notFound } from 'next/navigation';
import Link from 'next/link';
import { dbConnect } from '@/lib/db/connect';
import Course from '@/models/Course';
import { CourseEditForm } from './edit-form';

export const dynamic = 'force-dynamic';

function toDateInput(value) {
  if (!value) return '';
  return new Date(value).toISOString().slice(0, 10); // YYYY-MM-DD
}

export default async function CourseEditPage({ params }) {
  const { id } = await params;

  await dbConnect();
  const c = await Course.findById(id).lean().catch(() => null);
  if (!c) notFound();

  // Plain, serializable initial values for the client form.
  const initial = {
    // Zone A (read-only mirror)
    courseCode: c.courseCode,
    courseName: c.courseName,
    coverUrl: c.coverUrl || '',
    // Zone B (editable)
    price: c.price ?? 0,
    sellPrice: c.sellPrice ?? 0,
    isPromotion: !!c.isPromotion,
    promotionStart: toDateInput(c.promotionStart),
    promotionEnd: toDateInput(c.promotionEnd),
    notes: c.notes || '',
    isActive: c.isActive !== false,
    sortOrder: c.sortOrder ?? 0,
  };

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6">
      <div>
        <Link
          href="/admin/courses"
          className="text-sm text-[var(--9e-action)] hover:underline"
        >
          ← กลับไปรายการหลักสูตร
        </Link>
        <h1 className="mt-2 text-2xl font-bold text-[var(--text-primary)]">
          แก้ไขหลักสูตร
        </h1>
      </div>
      <CourseEditForm id={String(c._id)} initial={initial} />
    </div>
  );
}
