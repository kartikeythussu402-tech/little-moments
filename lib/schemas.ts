import { z } from "zod";

export const ContactSchema = z.object({
  name: z.string().trim().min(1, "Please tell us your name.").max(80),
  email: z.email("Please enter a valid email address.").max(254),
  category: z.enum(["question", "feedback", "bug", "privacy", "other"]),
  message: z.string().trim().min(5, "Please write a few more words.").max(2000),
  website: z.string().max(0).optional(), // honeypot — must stay empty
});

const phone = z
  .string()
  .trim()
  .max(20)
  .regex(/^(\+?[0-9 ()-]{7,20})?$/, "Enter a valid phone number, e.g. +91 98765 43210.")
  .optional()
  .transform((v) => v || undefined);

export const SignupSchema = z.object({
  fullName: z.string().trim().min(1, "Please enter your name.").max(80),
  email: z.email("Please enter a valid email address.").max(254),
  password: z.string().min(8, "Use at least 8 characters.").max(72, "That password is too long."),
  phone,
  referralSource: z.string().trim().max(80).optional(),
  acceptTerms: z.literal(true, { error: "Please accept the Terms and Privacy Policy to continue." }),
  marketingConsent: z.boolean().default(false),
  next: z.string().max(300).optional(),
});

export const ProfileSchema = z.object({
  fullName: z.string().trim().min(1, "Name can't be empty.").max(80),
  phone: z.string().trim().max(20).regex(/^(\+?[0-9 ()-]{7,20})?$/, "Enter a valid phone number."),
  language: z.enum(["en", "hi", "mr", "bn", "ta", "te", "gu", "kn", "ml", "pa"]),
  marketingConsent: z.boolean(),
});

export const LANGUAGES = [
  ["en", "English"],
  ["hi", "हिन्दी (Hindi)"],
  ["mr", "मराठी (Marathi)"],
  ["bn", "বাংলা (Bengali)"],
  ["ta", "தமிழ் (Tamil)"],
  ["te", "తెలుగు (Telugu)"],
  ["gu", "ગુજરાતી (Gujarati)"],
  ["kn", "ಕನ್ನಡ (Kannada)"],
  ["ml", "മലയാളം (Malayalam)"],
  ["pa", "ਪੰਜਾਬੀ (Punjabi)"],
] as const;

/** Only allow same-site relative redirects after auth. */
export function safeNext(next: string | null | undefined, fallback = "/dashboard") {
  if (!next || !next.startsWith("/") || next.startsWith("//") || next.startsWith("/\\")) return fallback;
  return next;
}
