import NextAuth from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import bcrypt from 'bcryptjs';
import { authConfig } from './config.js';
import { loginSchema } from './schema.js';
import { dbConnect } from '../db/connect.js';
import Admin from '../../models/Admin.js';

/**
 * NODE-runtime auth. This file (unlike config.js) may import Mongoose/bcrypt,
 * because it is only pulled into the Node runtime — the API route handler and
 * server components/actions — never into middleware.
 */
export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        const parsed = loginSchema.safeParse(credentials);
        if (!parsed.success) return null;

        const { email, password } = parsed.data;
        await dbConnect();

        const admin = await Admin.findOne({
          email: email.toLowerCase().trim(),
          active: true,
        });
        if (!admin) return null;

        const ok = await bcrypt.compare(password, admin.password);
        if (!ok) return null;

        return { id: String(admin._id), name: admin.name, email: admin.email };
      },
    }),
  ],
});
