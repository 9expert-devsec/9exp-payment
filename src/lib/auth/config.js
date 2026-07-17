/**
 * EDGE-SAFE auth config.
 *
 * This file is imported by middleware.js, which runs on the Edge runtime. It
 * MUST NOT import mongoose, bcryptjs, the DB connection, models, or any other
 * Node-only module — Edge rejects the dynamic evaluation Mongoose relies on, and
 * the failure happens at RUNTIME (middleware invocation), not at build time,
 * which makes it easy to miss. Keep this file pure config only.
 *
 * The Credentials provider (which needs Node) is added in options.js, not here.
 */

/** @type {import('next-auth').NextAuthConfig} */
export const authConfig = {
  trustHost: true,
  pages: {
    signIn: '/admin/login',
    error: '/admin/login',
  },
  session: {
    strategy: 'jwt',
    maxAge: 60 * 60 * 72, // 72h
    updateAge: 60 * 60 * 16, // refresh the token if older than 16h
  },
  providers: [], // real providers are injected in options.js (Node runtime)
  callbacks: {
    // Copy id + name onto the token. No DB access here (edge-safe).
    jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.name = user.name;
      }
      return token;
    },
    // Expose id + name on the session.
    session({ session, token }) {
      if (token && session.user) {
        session.user.id = token.id;
        session.user.name = token.name;
      }
      return session;
    },
  },
};
