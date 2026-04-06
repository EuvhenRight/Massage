import { z } from "zod";
import { parseWhatsappE164 } from "./phone-e164";

export type BookingSchemaMessages = {
  fullNameMin: string;
  fullNameMax: string;
  invalidEmail: string;
  invalidPhone: string;
};

const defaultMessages: BookingSchemaMessages = {
  fullNameMin: "Full name must be at least 3 characters",
  fullNameMax: "Full name must be at most 100 characters",
  invalidEmail: "Invalid email address",
  invalidPhone:
    "Enter a valid mobile number with country code (e.g. +421 912 345 678). National numbers like 09xx work if they match a supported country.",
};

export function getBookingSchema(messages: Partial<BookingSchemaMessages> = {}) {
  const m = { ...defaultMessages, ...messages };
  return z.object({
    service: z.string().optional(),
    fullName: z.string().min(3, m.fullNameMin).max(100, m.fullNameMax),
    email: z.string().email(m.invalidEmail),
    phone: z
      .string()
      .refine((val) => parseWhatsappE164(val) !== null, { message: m.invalidPhone }),
  });
}

export const bookingSchema = getBookingSchema();
export type BookingFormData = z.infer<ReturnType<typeof getBookingSchema>>;
