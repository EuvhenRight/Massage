"use client";

import { useState } from "react";
import Image from "next/image";
import { motion } from "framer-motion";
import Navbar from "@/components/Navbar";
import ServiceCard from "@/components/ServiceCard";
import MembershipCard from "@/components/MembershipCard";
import BookingCalendar from "@/components/BookingCalendar";
import FloatingCTA from "@/components/FloatingCTA";

const SERVICES = [
  {
    title: "Swedish Massage",
    description:
      "Classic relaxation with flowing strokes to melt away tension and restore balance.",
    price: "from €120",
    image:
      "https://images.unsplash.com/photo-1544161515-4ab6ce6db874?w=800&q=80",
  },
  {
    title: "Deep Tissue",
    description:
      "Targeted pressure for chronic muscle pain. Ideal for athletes and desk workers.",
    price: "from €150",
    image:
      "https://images.unsplash.com/photo-1519824145371-296894a0daa9?w=800&q=80",
  },
  {
    title: "Hot Stone",
    description:
      "Heated basalt stones transfer warmth deep into muscles for profound relaxation.",
    price: "from €180",
    image:
      "https://images.unsplash.com/photo-1540555700478-4be289fbecef?w=800&q=80",
  },
  {
    title: "Aromatherapy",
    description:
      "Essential oils enhance your journey. Choose your scent profile for the session.",
    price: "from €140",
    image:
      "https://images.unsplash.com/photo-1600334129128-685c5582fd35?w=800&q=80",
  },
  {
    title: "Sports Recovery",
    description:
      "Precision techniques to accelerate recovery and improve performance.",
    price: "from €170",
    image:
      "https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=800&q=80",
  },
  {
    title: "Couples Retreat",
    description:
      "Side-by-side massage in a private suite. The ultimate shared experience.",
    price: "from €320",
    image:
      "https://images.unsplash.com/photo-1515377905703-c4788e51af15?w=800&q=80",
  },
];

const MEMBERSHIPS = [
  {
    tier: "Silver" as const,
    price: "€99/mo",
    features: [
      "10% off all services",
      "Priority booking window",
      "Complimentary tea & refreshments",
      "Birthday month special",
    ],
    highlighted: false,
  },
  {
    tier: "Black" as const,
    price: "€199/mo",
    features: [
      "20% off all services",
      "24hr priority booking",
      "One complimentary facial per quarter",
      "Exclusive member events",
      "Dedicated therapist matching",
    ],
    highlighted: true,
  },
  {
    tier: "Obsidian" as const,
    price: "€399/mo",
    features: [
      "30% off all services",
      "Unlimited priority booking",
      "Private suite access",
      "Monthly complimentary treatment",
      "Personal wellness concierge",
      "Invite-only experiences",
    ],
    highlighted: false,
  },
];

export default function MassagePage() {
  const [bookingOpen, setBookingOpen] = useState(false);

  return (
    <>
      <Navbar />
      <FloatingCTA />

      {/* Hero */}
      <section
        className="relative min-h-screen flex items-center justify-center overflow-hidden noise-overlay"
        aria-labelledby="hero-heading"
      >
        <div className="absolute inset-0">
          <Image
            src="https://images.unsplash.com/photo-1544161515-4ab6ce6db874?w=1920"
            alt=""
            fill
            className="object-cover opacity-40"
            priority
            sizes="100vw"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-nearBlack/70 via-nearBlack/50 to-nearBlack" />
          <div
            className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(212,175,55,0.08)_0%,transparent_70%)]"
            aria-hidden
          />
        </div>
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="relative z-10 text-center px-6"
        >
          <h1
            id="hero-heading"
            className="font-serif text-6xl md:text-8xl lg:text-9xl text-icyWhite tracking-tight aurora-text"
          >
            Massage
          </h1>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="mt-6 text-icyWhite/70 text-lg md:text-xl max-w-xl mx-auto"
          >
            A deep-scroll sanctuary. Surrender to touch.
          </motion.p>
        </motion.div>
      </section>

      {/* Services */}
      <section
        id="services"
        className="py-24 lg:py-32 px-6 lg:px-8"
        aria-labelledby="services-heading"
      >
        <div className="max-w-7xl mx-auto">
          <motion.h2
            id="services-heading"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="font-serif text-4xl md:text-5xl text-icyWhite text-center mb-4"
          >
            Destinations
          </motion.h2>
          <motion.p
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            className="text-icyWhite/60 text-center mb-16 max-w-2xl mx-auto"
          >
            Each journey is unique. Choose yours.
          </motion.p>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {SERVICES.map((service, i) => (
              <ServiceCard key={service.title} {...service} index={i} />
            ))}
          </div>
        </div>
      </section>

      {/* Membership */}
      <section
        id="membership"
        className="py-24 lg:py-32 px-6 lg:px-8 bg-nearBlack/50"
        aria-labelledby="membership-heading"
      >
        <div className="max-w-7xl mx-auto">
          <motion.h2
            id="membership-heading"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="font-serif text-4xl md:text-5xl text-icyWhite text-center mb-4"
          >
            Membership
          </motion.h2>
          <motion.p
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            className="text-icyWhite/60 text-center mb-16 max-w-2xl mx-auto"
          >
            Elevate your ritual. Unlock more.
          </motion.p>
          <div className="grid md:grid-cols-3 gap-8">
            {MEMBERSHIPS.map((membership, i) => (
              <MembershipCard key={membership.tier} {...membership} index={i} />
            ))}
          </div>
        </div>
      </section>

      {/* Booking CTA */}
      <section
        id="booking"
        className="py-24 lg:py-32 px-6 lg:px-8"
        aria-labelledby="booking-heading"
      >
        <div className="max-w-3xl mx-auto text-center">
          <motion.h2
            id="booking-heading"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="font-serif text-4xl md:text-5xl text-icyWhite mb-4"
          >
            Reserve Your Time
          </motion.h2>
          <motion.p
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            className="text-icyWhite/60 mb-10"
          >
            Select a date and time that works for you.
          </motion.p>
          <motion.button
            type="button"
            onClick={() => setBookingOpen(true)}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="px-10 py-4 rounded-lg bg-gold-soft/20 border border-gold-soft/50 text-gold-soft font-medium tracking-wider uppercase hover:bg-gold-soft/30 hover:shadow-glow transition-all duration-300"
            aria-label="Open booking calendar"
          >
            Book Now
          </motion.button>
        </div>
      </section>

      <BookingCalendar
        isOpen={bookingOpen}
        onClose={() => setBookingOpen(false)}
        services={SERVICES.map((s) => ({ title: s.title }))}
      />
    </>
  );
}
