import { z } from 'zod';

// Login credentials schema, shared by the provider's authorize() and the
// login form.
export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});
