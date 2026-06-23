import { z } from 'zod';

export const RegisterInput = z.object({
  email: z.string().email(),
  password: z.string().min(8).max(128),
  name: z.string().min(1).max(255),
});

export const LoginInput = z.object({
  email: z.string().email(),
  password: z.string(),
});

export const AuthResponse = z.object({
  user: z.object({
    id: z.string().uuid(),
    email: z.string().email(),
    name: z.string(),
    role: z.enum(['customer', 'agent', 'admin']),
  }),
  token: z.string(),
});

export type RegisterInput = z.infer<typeof RegisterInput>;
export type LoginInput = z.infer<typeof LoginInput>;
export type AuthResponse = z.infer<typeof AuthResponse>;
