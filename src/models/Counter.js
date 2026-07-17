import mongoose from 'mongoose';

/**
 * Atomic counter for the monthly quotation-number sequence.
 * `_id` is the period key (e.g. "QE6907"); `seq` is the running number,
 * incremented atomically via $inc. See src/lib/quotation-number.js.
 */
const counterSchema = new mongoose.Schema(
  {
    _id: { type: String }, // period key, e.g. "QE6907"
    seq: { type: Number, default: 0 },
  },
  { versionKey: false }
);

export default mongoose.models.Counter ||
  mongoose.model('Counter', counterSchema);
