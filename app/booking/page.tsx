"use client";

import Navbar from "@/components/Navbar";
import BookingFlow from "@/components/booking-flow";

const SERVICES = [
  { title: "Swedish Massage" },
  { title: "Deep Tissue" },
  { title: "Hot Stone" },
  { title: "Aromatherapy" },
  { title: "Sports Recovery" },
  { title: "Couples Retreat" },
];

export default function BookingPage() {
  return (
    <main className="min-h-screen bg-nearBlack text-icyWhite">
      <Navbar />
      <div className="pt-20 pb-6 px-4 sm:px-6 lg:px-8">
        <div className="max-w-5xl mx-auto">
          <div className="rounded-2xl border border-white/10 bg-nearBlack/50">
            <BookingFlow
              services={SERVICES}
              defaultDuration={60}
            />
          </div>
        </div>
      </div>
    </main>
  );
}
