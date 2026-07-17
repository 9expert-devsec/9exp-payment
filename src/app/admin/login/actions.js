'use server';

import { AuthError } from 'next-auth';
import { signIn } from '@/lib/auth/options';

/**
 * Login server action (used with useActionState).
 * Returns a GENERIC error on any failure — never reveals whether the email
 * exists. On success signIn throws a redirect, which must propagate.
 */
export async function loginAction(prevState, formData) {
  try {
    await signIn('credentials', {
      email: formData.get('email'),
      password: formData.get('password'),
      redirectTo: '/admin/courses',
    });
    return { error: null };
  } catch (error) {
    if (error instanceof AuthError) {
      return { error: 'อีเมลหรือรหัสผ่านไม่ถูกต้อง' };
    }
    // Redirect (and anything else) must be re-thrown.
    throw error;
  }
}
