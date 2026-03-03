import { z } from "zod";

// International phone regex: optional +, digits, spaces, dashes, parentheses
const phoneRegex = /^\+?[\d\s\-()]{10,20}$/;

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
  invalidPhone: "Invalid phone number (use international format, e.g. +1 234 567 8900)",
};

export function getBookingSchema(messages: Partial<BookingSchemaMessages> = {}) {
  const m = { ...defaultMessages, ...messages };
  return z.object({
    service: z.string().optional(),
    fullName: z.string().min(3, m.fullNameMin).max(100, m.fullNameMax),
    email: z.string().email(m.invalidEmail),
    phone: z.string().regex(phoneRegex, m.invalidPhone),
  });
}

export const bookingSchema = getBookingSchema();
export type BookingFormData = z.infer<ReturnType<typeof getBookingSchema>>;
