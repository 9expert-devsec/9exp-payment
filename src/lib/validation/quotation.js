import { z } from 'zod';

/**
 * Public quotation request form. Shared by the client form (via zodResolver) and
 * the createQuotationAction server action — one source of truth, so a rule can
 * never drift between the two.
 *
 * The server MUST re-parse with this schema. Client-side validation is a UX
 * affordance, not a trust boundary.
 *
 * NOTE: no price field appears anywhere in this schema, deliberately. Pricing is
 * recomputed server-side from the database course. There is nothing here for a
 * tampered client to submit that could move the total.
 */

const required = (message) => z.string().trim().min(1, message);

/**
 * Thai mobile/landline. Spaces, dashes and parentheses are stripped before
 * counting, because people type "08-1234-5678" and "081 234 5678" and both are
 * the same number. A leading +66 is normalised to a local 0.
 */
function digitsOf(value) {
  return String(value || '')
    .replace(/^\+66/, '0')
    .replace(/[\s\-().]/g, '');
}

const phoneRequired = required('กรุณากรอกเบอร์โทรศัพท์').refine(
  (v) => /^\d{9,10}$/.test(digitsOf(v)),
  'เบอร์โทรศัพท์ไม่ถูกต้อง (9–10 หลัก)'
);

const personSchema = z.object({
  firstName: z.string().trim().default(''),
  lastName: z.string().trim().default(''),
  email: z.string().trim().default(''),
  phone: z.string().trim().default(''),
});

export const quotationFormSchema = z
  .object({
    courseId: required('กรุณาเลือกหลักสูตร'),

    coordinator: z.object({
      firstName: required('กรุณากรอกชื่อ'),
      lastName: required('กรุณากรอกนามสกุล'),
      email: required('กรุณากรอกอีเมล').pipe(
        z.email('รูปแบบอีเมลไม่ถูกต้อง')
      ),
      phone: phoneRequired,
    }),

    attendeesCount: z.coerce
      .number('กรุณากรอกจำนวนผู้เข้าอบรม')
      .int('ต้องเป็นจำนวนเต็ม')
      .min(1, 'อย่างน้อย 1 คน')
      .max(50, 'สูงสุด 50 คน'),

    attendeesListProvided: z.boolean(),
    attendees: z.array(personSchema).default([]),

    // Form-only: drives the auto-fill of attendee #1. Never persisted.
    coordinatorIsAttending: z.boolean().default(false),

    invoice: z.object({
      type: z.enum(['individual', 'corporate'], {
        message: 'กรุณาเลือกประเภทผู้ออกใบเสร็จ',
      }),
      companyName: z.string().trim().default(''),
      branch: z.string().trim().default(''),
      taxId: z.string().trim().default(''),
      addressLine: z.string().trim().default(''),
      subDistrict: z.string().trim().default(''),
      district: z.string().trim().default(''),
      province: z.string().trim().default(''),
      postalCode: z.string().trim().default(''),
    }),

    notes: z.string().trim().max(500, 'ยาวเกิน 500 ตัวอักษร').optional().default(''),
  })
  .superRefine((data, ctx) => {
    // ---- Attendee list ----
    // When the list is not provided the array is ignored entirely and persisted
    // as []; validating it would block a legitimate "names to follow" request.
    if (data.attendeesListProvided) {
      if (data.attendees.length !== data.attendeesCount) {
        ctx.addIssue({
          code: 'custom',
          path: ['attendees'],
          message: `กรุณากรอกรายชื่อให้ครบ ${data.attendeesCount} คน`,
        });
      }

      data.attendees.forEach((attendee, i) => {
        if (!attendee.firstName?.trim()) {
          ctx.addIssue({
            code: 'custom',
            path: ['attendees', i, 'firstName'],
            message: 'กรุณากรอกชื่อ',
          });
        }
        if (!attendee.lastName?.trim()) {
          ctx.addIssue({
            code: 'custom',
            path: ['attendees', i, 'lastName'],
            message: 'กรุณากรอกนามสกุล',
          });
        }
        // Phone is optional per attendee; email is not.
        const email = attendee.email?.trim();
        if (!email) {
          ctx.addIssue({
            code: 'custom',
            path: ['attendees', i, 'email'],
            message: 'กรุณากรอกอีเมล',
          });
        } else if (!z.email().safeParse(email).success) {
          ctx.addIssue({
            code: 'custom',
            path: ['attendees', i, 'email'],
            message: 'รูปแบบอีเมลไม่ถูกต้อง',
          });
        }
      });
    }

    // ---- Invoice ----
    const { type, companyName, taxId } = data.invoice;

    if (type === 'corporate') {
      if (!companyName?.trim()) {
        ctx.addIssue({
          code: 'custom',
          path: ['invoice', 'companyName'],
          message: 'กรุณากรอกชื่อบริษัท',
        });
      }
      if (!taxId?.trim()) {
        ctx.addIssue({
          code: 'custom',
          path: ['invoice', 'taxId'],
          message: 'กรุณากรอกเลขประจำตัวผู้เสียภาษี',
        });
      } else if (!/^\d{13}$/.test(taxId.trim())) {
        ctx.addIssue({
          code: 'custom',
          path: ['invoice', 'taxId'],
          message: 'เลขประจำตัวผู้เสียภาษีต้องเป็นตัวเลข 13 หลัก',
        });
      }
    } else if (taxId?.trim() && !/^\d{13}$/.test(taxId.trim())) {
      // Individual: tax id is optional, but a supplied one must still be valid —
      // a malformed number on a tax document is worse than no number.
      ctx.addIssue({
        code: 'custom',
        path: ['invoice', 'taxId'],
        message: 'เลขประจำตัวผู้เสียภาษีต้องเป็นตัวเลข 13 หลัก',
      });
    }

    // ---- Address (required for both types; it prints on the document) ----
    if (!data.invoice.addressLine?.trim()) {
      ctx.addIssue({
        code: 'custom',
        path: ['invoice', 'addressLine'],
        message: 'กรุณากรอกที่อยู่',
      });
    }
    if (!data.invoice.province?.trim()) {
      ctx.addIssue({
        code: 'custom',
        path: ['invoice', 'province'],
        message: 'กรุณากรอกจังหวัด',
      });
    }
    const postalCode = data.invoice.postalCode?.trim();
    if (!postalCode) {
      ctx.addIssue({
        code: 'custom',
        path: ['invoice', 'postalCode'],
        message: 'กรุณากรอกรหัสไปรษณีย์',
      });
    } else if (!/^\d{5}$/.test(postalCode)) {
      ctx.addIssue({
        code: 'custom',
        path: ['invoice', 'postalCode'],
        message: 'รหัสไปรษณีย์ต้องเป็นตัวเลข 5 หลัก',
      });
    }
  });
