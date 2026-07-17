import mongoose from 'mongoose';

/**
 * This app has its OWN admins, separate from the sibling app's. Deliberately
 * minimal: no roles/RBAC, no 2FA — out of scope. Auth wiring is Phase 2; this
 * is the model only.
 */
const adminSchema = new mongoose.Schema(
  {
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    name: { type: String, required: true, trim: true },
    password: { type: String, required: true }, // bcrypt hash
    active: { type: Boolean, default: true },
    lastLoginAt: { type: Date },
  },
  { timestamps: true }
);

export default mongoose.models.Admin || mongoose.model('Admin', adminSchema);
