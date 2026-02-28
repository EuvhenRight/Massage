import { z } from "zod";

// International phone regex: optional +, digits, spaces, dashes, parentheses
const phoneRegex = /^\+?[\d\s\-()]{10,20}$/;

export const bookingSchema = z.object({
  service: z.string().optional(),
  fullName: z
    .string()
    .min(3, "Full name must be at least 3 characters")
    .max(100, "Full name must be at most 100 characters"),
  email: z.string().email("Invalid email address"),
  phone: z
    .string()
    .regex(phoneRegex, "Invalid phone number (use international format, e.g. +1 234 567 8900)"),
});

export type BookingFormData = z.infer<typeof bookingSchema>;
