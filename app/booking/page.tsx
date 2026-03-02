"use client";

import { useEffect, useState } from "react";
import Navbar from "@/components/Navbar";
import BookingFlow from "@/components/booking-flow";
import type { ServiceData } from "@/lib/services";

export default function BookingPage() {
  const [services, setServices] = useState<ServiceData[]>([]);

  useEffect(() => {
    fetch("/api/services?place=massage")
      .then((r) => r.ok && r.json())
      .then((data) => (Array.isArray(data) ? setServices(data) : []))
      .catch(() => {});
  }, []);

  const serviceOptions = services.map((s) => ({
    title: s.title,
    durationMinutes: s.durationMinutes,
  }));

  return (
    <main className="min-h-screen bg-nearBlack text-icyWhite">
      <Navbar />
      <div className="pt-20 pb-6 px-4 sm:px-6 lg:px-8">
        <div className="max-w-5xl mx-auto">
          <div className="rounded-2xl border border-white/10 bg-nearBlack/50">
            <BookingFlow
              services={serviceOptions.length > 0 ? serviceOptions : [{ title: "Appointment", durationMinutes: 60 }]}
              defaultDuration={60}
              place="massage"
            />
          </div>
        </div>
      </div>
    </main>
  );
}
