import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { dbConnect } from '../lib/db/connect.js';
import Admin from '../models/Admin.js';

/**
 * Seed / update the first admin.
 *
 *   node --env-file=.env.local src/scripts/create-admin.js <email> <name> <password>
 *
 * This is a one-shot CLI script (it exits immediately), so it is allowed to
 * disconnect at the end — unlike request-handling code, which must never tear
 * down the shared cached connection.
 */
async function main() {
  const [, , email, name, password] = process.argv;

  if (!email || !name || !password) {
    console.error(
      'Usage: node --env-file=.env.local src/scripts/create-admin.js <email> <name> <password>'
    );
    process.exit(1);
  }

  const passwordHash = await bcrypt.hash(password, 10);

  await dbConnect();

  const admin = await Admin.findOneAndUpdate(
    { email: email.toLowerCase().trim() },
    {
      $set: { name: name.trim(), password: passwordHash, active: true },
      $setOnInsert: { email: email.toLowerCase().trim() },
    },
    { upsert: true, returnDocument: 'after', setDefaultsOnInsert: true }
  );

  console.log(`Admin upserted: ${admin.email} (${admin.name}) — id ${admin._id}`);
}

main()
  .catch((err) => {
    console.error('create-admin failed:', err?.message || err);
    process.exitCode = 1;
  })
  .finally(async () => {
    // CLI exception: safe to disconnect here because the process is exiting.
    await mongoose.disconnect();
  });
