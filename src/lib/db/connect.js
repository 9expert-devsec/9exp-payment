import mongoose from 'mongoose';

/**
 * Mongoose connection helper for a serverless (Vercel Lambda) + Next dev
 * environment.
 *
 * MOVING CLUSTERS LATER: change only two things, both env vars, no code edits:
 *   - MONGODB_URI          (point at the new cluster; keep NO db path segment)
 *   - MONGO_MAX_POOL_SIZE  (retune the pool for the new tier)
 * The database name stays in MONGODB_DB_NAME and is applied via `dbName` below,
 * which is why the URI must not carry a database path segment.
 */

const MONGODB_URI = process.env.MONGODB_URI;
if (!MONGODB_URI) {
  // Fail loudly at import time rather than on the first query.
  throw new Error(
    'MONGODB_URI is not set. Add it to .env.local (see .env.example).'
  );
}

const MONGODB_DB_NAME = process.env.MONGODB_DB_NAME || '9exp_payment';
// Mongoose defaults maxPoolSize to 100; across many warm Lambdas that exhausts
// the cluster's connection cap. Keep it small and tunable via env.
const MAX_POOL_SIZE = Number(process.env.MONGO_MAX_POOL_SIZE) || 3;

// Cache the connection (and the in-flight connect promise) on globalThis.
// Next dev hot-reloads modules and Vercel reuses warm Lambdas; without this
// cache we would open a new connection per reload/invocation and exhaust the
// cluster. Using globalThis (not a module-scope var) survives hot reloads.
let cached = globalThis.__mongoose;
if (!cached) {
  cached = globalThis.__mongoose = { conn: null, promise: null };
}

export async function dbConnect() {
  if (cached.conn) return cached.conn;

  if (!cached.promise) {
    const opts = {
      dbName: MONGODB_DB_NAME, // select the database in code, not via the URI
      maxPoolSize: MAX_POOL_SIZE,
      minPoolSize: 1,
      // In serverless, buffering hides "not connected" bugs and delays errors.
      bufferCommands: false,
      serverSelectionTimeoutMS: 10000,
      socketTimeoutMS: 45000,
      maxIdleTimeMS: 30000,
    };

    cached.promise = mongoose.connect(MONGODB_URI, opts).then((m) => m);
  }

  try {
    cached.conn = await cached.promise;
  } catch (err) {
    // Reset so the next call retries instead of reusing a rejected promise.
    cached.promise = null;
    throw err;
  }

  return cached.conn;
}

// NOTE: never call mongoose.disconnect() from request-handling code. It would
// tear down the cached connection that other concurrent invocations share.
// Only one-shot CLI scripts (which exit right after) may disconnect.
