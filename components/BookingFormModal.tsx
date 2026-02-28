"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { bookingSchema, type BookingFormData } from "@/lib/booking-schema";
import { bookAppointment } from "@/lib/book-appointment";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";

interface BookingFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultDate?: Date;
  defaultHour?: number;
  defaultMinute?: number;
  service?: string;
  services?: { title: string }[];
  onSuccess?: () => void;
}

function formatSlot(date: Date, hour: number, minute: number): string {
  return `${date.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })} at ${hour === 0 ? 12 : hour > 12 ? hour - 12 : hour}:${String(minute).padStart(2, "0")} ${hour < 12 ? "am" : "pm"}`;
}

export default function BookingFormModal({
  isOpen,
  onClose,
  defaultDate,
  defaultHour = 9,
  defaultMinute = 0,
  service = "",
  services = [],
  onSuccess,
}: BookingFormModalProps) {
  const date = defaultDate ?? new Date();
  const defaultService = service || services[0]?.title || "";

  const form = useForm<BookingFormData>({
    resolver: zodResolver(bookingSchema),
    defaultValues: {
      service: defaultService,
      fullName: "",
      email: "",
      phone: "",
    },
  });

  useEffect(() => {
    if (isOpen) {
      form.reset({
        service: defaultService,
        fullName: "",
        email: "",
        phone: "",
      });
    }
  }, [isOpen, defaultService, form]);

  const onSubmit = async (values: BookingFormData) => {
    try {
      const startTime = `${String(defaultHour).padStart(2, "0")}:${String(defaultMinute).padStart(2, "0")}`;
      const dateStr = date.toISOString().slice(0, 10);
      const slotDate = new Date(date);
      slotDate.setHours(defaultHour, defaultMinute, 0, 0);

      await bookAppointment({
        date: dateStr,
        startTime,
        durationMinutes: 60,
        service: values.service || "",
        fullName: values.fullName,
        email: values.email,
        phone: values.phone,
      });

      const res = await fetch("/api/send-confirmation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          to: values.email,
          customerName: values.fullName,
          date: slotDate.toLocaleDateString("en-US", {
            weekday: "short",
            month: "short",
            day: "numeric",
            year: "numeric",
          }),
          time: slotDate.toLocaleTimeString("en-US", {
            hour: "numeric",
            minute: "2-digit",
            hour12: true,
          }),
          service: values.service,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        const errMsg = data?.error ?? "Email could not be sent.";
        toast.error(`Booking confirmed, but ${errMsg}`);
      } else {
        toast.success("Booking confirmed! Check your email.");
      }

      onSuccess?.();
      onClose();
    } catch (err) {
      const message =
        err instanceof Error && err.message === "OVERLAP"
          ? "This time slot is no longer available. Please choose another."
          : "Booking failed. Please try again.";
      toast.error(message);
    }
  };

  if (!isOpen) return null;

  return (
    <>
      <div
        className="fixed inset-0 z-50 bg-nearBlack/80 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden
      />
      <div className="fixed left-1/2 top-1/2 z-[51] w-full max-w-md -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-border bg-card p-6 text-card-foreground shadow-lg">
        <h2 className="font-serif text-xl mb-2">New appointment</h2>
        <p className="text-sm text-muted-foreground mb-6">
          {formatSlot(date, defaultHour, defaultMinute)}
        </p>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {services.length > 0 && (
              <FormField
                control={form.control}
                name="service"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Service</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a service" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {services.map((s) => (
                          <SelectItem key={s.title} value={s.title}>
                            {s.title}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            <FormField
              control={form.control}
              name="fullName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Full name *</FormLabel>
                  <FormControl>
                    <Input placeholder="John Smith" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email *</FormLabel>
                  <FormControl>
                    <Input
                      type="email"
                      placeholder="john@example.com"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="phone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Phone *</FormLabel>
                  <FormControl>
                    <Input
                      type="tel"
                      placeholder="+1 234 567 8900"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex gap-3 pt-2">
              <Button
                type="button"
                variant="outline"
                className="flex-1"
                onClick={onClose}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="flex-1 bg-primary text-primary-foreground hover:bg-primary/90"
                disabled={form.formState.isSubmitting}
              >
                {form.formState.isSubmitting ? "Booking..." : "Confirm"}
              </Button>
            </div>
          </form>
        </Form>
      </div>
    </>
  );
}
