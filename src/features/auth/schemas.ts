import { z } from "zod";

import { indianPhoneSchema } from "@/lib/validation/phone";

import { authStrings, passwordStrings } from "./strings";

const otpCode = z
  .string()
  .trim()
  .regex(/^\d{6}$/, authStrings.errors.invalidCode);

const email = z.string().trim().toLowerCase().pipe(z.email(authStrings.errors.invalidEmail).max(254));

export const phoneOtpRequestSchema = z.object({ phone: indianPhoneSchema });
export const phoneOtpVerifySchema = z.object({ phone: indianPhoneSchema, token: otpCode });
export const emailOtpRequestSchema = z.object({ email, next: z.string().optional() });
export const emailOtpVerifySchema = z.object({ email, token: otpCode });
export const oauthSchema = z.object({ next: z.string().optional() });

export const passwordSignInSchema = z.object({
  email,
  password: z.string().min(1, authStrings.errors.passwordRequired).max(200),
  next: z.string().optional(),
});

// Supabase limits passwords to 72 bytes (bcrypt).
export const setPasswordSchema = z
  .object({
    password: z.string().min(8, passwordStrings.errors.tooShort).max(72, passwordStrings.errors.tooLong),
    confirm: z.string(),
  })
  .refine((v) => v.password === v.confirm, { message: passwordStrings.errors.mismatch, path: ["confirm"] });
