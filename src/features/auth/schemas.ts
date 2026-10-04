import { z } from "zod";

import { indianPhoneSchema } from "@/lib/validation/phone";

import { authStrings } from "./strings";

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
