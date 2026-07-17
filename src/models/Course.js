import mongoose from 'mongoose';

/**
 * Course catalogue.
 *
 * The schema has two strictly separated zones. The boundary is the whole point
 * of this model, so keep them grouped and do not blur them:
 *
 *  - Zone A is a READ-ONLY MIRROR of MSDB. The sync job overwrites these fields
 *    from upstream; this app never edits them by hand.
 *  - Zone B is OWNED BY THIS APP. MSDB never sees these. The sync job must never
 *    touch them, or every configured price/promotion would be wiped.
 *
 * DELIBERATELY ABSENT: MSDB's `o_course_price` and `o_course_netprice`. All
 * pricing lives here (Zone B) so a promo change never means editing MSDB and
 * re-syncing. Do not add them "just in case".
 */
const courseSchema = new mongoose.Schema(
  {
    // ----- Zone A: synced from MSDB (read-only mirror; never edited here) -----
    msdbId: { type: String, required: true, unique: true, index: true }, // upstream _id
    courseCode: { type: String, required: true, trim: true, index: true }, // o_course_id
    courseName: { type: String, required: true, trim: true }, // o_course_name
    coverUrl: { type: String, trim: true }, // o_course_cover_url
    syncedAt: { type: Date },

    // ----- Zone B: owned by this app (MSDB never sees these) -----
    price: { type: Number, min: 0, default: 0 }, // full list price
    // sellPrice is what the CUSTOMER PAYS, VAT *INCLUDED*. This is
    // counter-intuitive and the legacy system's naming actively misleads, so be
    // explicit: the ex-VAT unit price is derived, never stored, as
    //   exVat = sellPrice - (sellPrice / 107 * 7)
    // and the promo saving is  price - sellPrice.
    sellPrice: { type: Number, min: 0, default: 0 },
    isPromotion: { type: Boolean, default: false },
    promotionStart: { type: Date, default: null },
    promotionEnd: { type: Date, default: null },
    notes: { type: String, trim: true, default: '' },
    isActive: { type: Boolean, default: true }, // visibility in the public dropdown
    sortOrder: { type: Number, default: 0 },
  },
  { timestamps: true }
);

export default mongoose.models.Course ||
  mongoose.model('Course', courseSchema);
