import { z } from "zod";

// India-only mobile numbers at launch (D-006). Accepts "98765 43210", "09876543210", "+91 98765-43210".
// Output is E.164: "+919876543210".
export function normalizeIndianPhone(input: string): string | null {
  const digits = input.replace(/[\s\-().]/g, "");
  const match = /^(?:\+?91|0)?([6-9]\d{9})$/.exec(digits);
  return match ? `+91${match[1]}` : null;
}

export const indianPhoneSchema = z
  .string()
  .trim()
  .transform((value, ctx) => {
    const phone = normalizeIndianPhone(value);
    if (!phone) {
      ctx.addIssue({ code: "custom", message: "Enter a valid 10-digit Indian mobile number." });
      return z.NEVER;
    }
    return phone;
  });
