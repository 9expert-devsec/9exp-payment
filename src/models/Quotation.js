import mongoose from 'mongoose';

/**
 * A quotation is an accounting document. It must render identically FOREVER,
 * even after the underlying course's price or name later changes. That is why
 * the course is stored as an embedded SNAPSHOT (copied at creation time), never
 * as a reference to be populated. Do not replace this with a ref/populate.
 */

// Course values frozen at the moment the quotation was created.
const courseSnapshotSchema = new mongoose.Schema(
  {
    msdbId: { type: String },
    courseCode: { type: String },
    courseName: { type: String },
    price: { type: Number }, // list price at snapshot time
    sellPrice: { type: Number }, // VAT-inclusive sell price at snapshot time
    isPromotion: { type: Boolean },
    // Promotion window at snapshot time (printed in the promotion block).
    // Docs created before these fields existed simply lack them.
    promotionStart: { type: Date, default: null },
    promotionEnd: { type: Date, default: null },
    promoNote: { type: String },
    notes: { type: String },
  },
  { _id: false }
);

const personSchema = new mongoose.Schema(
  {
    firstName: { type: String },
    lastName: { type: String },
    email: { type: String, lowercase: true },
    phone: { type: String },
  },
  { _id: false }
);

const invoiceSchema = new mongoose.Schema(
  {
    type: { type: String, enum: ['individual', 'corporate'] },
    companyName: { type: String },
    branch: { type: String },
    taxId: { type: String },
    addressLine: { type: String },
    subDistrict: { type: String },
    district: { type: String },
    province: { type: String },
    postalCode: { type: String },
  },
  { _id: false }
);

const pricingSchema = new mongoose.Schema(
  {
    unitPriceExVat: { type: Number },
    seats: { type: Number },
    subtotal: { type: Number },
    vatRate: { type: Number, default: 0.07 },
    vatAmount: { type: Number },
    total: { type: Number },
    promoSavings: { type: Number, default: 0 },
    currency: { type: String, default: 'THB' },
  },
  { _id: false }
);

const quotationSchema = new mongoose.Schema(
  {
    quotationNo: { type: String, required: true, unique: true, index: true },
    // Capability token for the public success page and PDF (`?t=`). Not
    // indexed: lookups stay by _id, the token is only compared afterwards.
    // null = admin-only (see src/lib/quotation-access.js).
    publicToken: { type: String, default: null },
    course: courseSnapshotSchema,
    coordinator: { type: personSchema, required: true },
    attendeesCount: { type: Number, min: 1, max: 50, default: 1 },
    attendeesListProvided: { type: Boolean, default: true },
    attendees: { type: [personSchema], default: [] },
    invoice: invoiceSchema,
    pricing: pricingSchema,
    pdfUrl: { type: String, default: null },
    notes: { type: String, trim: true, maxlength: 500 },
    emailSentAt: { type: Date, default: null }, // last SUCCESSFUL send
    // Email delivery state (src/lib/email/send-quotation-email.js).
    //   pending: not attempted yet / in flight · sent · failed · skipped (no
    //   Postmark token configured in this environment).
    emailStatus: {
      type: String,
      enum: ['pending', 'sent', 'failed', 'skipped'],
      default: 'pending',
    },
    emailError: { type: String, default: null, maxlength: 500 },
    emailAttempts: { type: Number, default: 0 }, // every send attempt, any trigger
    lastEmailAttemptAt: { type: Date, default: null }, // drives the 120s resend spacing
    postmarkMessageId: { type: String, default: null },
    // Resends requested by the CUSTOMER from the success page (capped at 3).
    // Kept separate from emailAttempts, which also counts the create send and
    // admin resends, so the customer cap cannot be eaten by staff actions.
    customerResendCount: { type: Number, default: 0 },
    ipAddress: { type: String },
  },
  { timestamps: true }
);

quotationSchema.index({ createdAt: -1 });
quotationSchema.index({ 'coordinator.email': 1 });

export default mongoose.models.Quotation ||
  mongoose.model('Quotation', quotationSchema);
