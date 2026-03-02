"use client";

import Link from "next/link";
import Image from "next/image";
import { motion } from "framer-motion";
import Navbar from "@/components/Navbar";
import FloatingCTA from "@/components/FloatingCTA";

export default function DepilationPage() {
  return (
    <>
      <Navbar />
      <FloatingCTA />

      {/* Hero */}
      <section
        className="relative min-h-screen flex items-center justify-center overflow-hidden noise-overlay"
        aria-labelledby="depilation-hero"
      >
        <div className="absolute inset-0">
          <Image
            src="https://images.unsplash.com/photo-1519824145371-296894a0daa9?w=1920"
            alt=""
            fill
            className="object-cover opacity-40"
            priority
            sizes="100vw"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-nearBlack/70 via-nearBlack/50 to-nearBlack" />
        </div>
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="relative z-10 text-center px-6"
        >
          <h1
            id="depilation-hero"
            className="font-serif text-6xl md:text-8xl lg:text-9xl text-icyWhite tracking-tight aurora-text"
          >
            Depilation
          </h1>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="mt-6 text-icyWhite/70 text-lg md:text-xl max-w-xl mx-auto"
          >
            Precision. Care. Lasting smoothness.
          </motion.p>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.8 }}
            className="mt-12"
          >
            <Link
              href="/massage"
              className="text-gold-soft hover:text-gold-glow text-sm tracking-[0.2em] uppercase transition-colors"
            >
              ← Explore Massage
            </Link>
          </motion.div>
        </motion.div>
      </section>

      {/* Booking CTA */}
      <section className="py-32 px-6 text-center">
        <motion.p
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className="text-icyWhite/60 mb-6"
        >
          Book your depilation appointment.
        </motion.p>
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className="flex flex-wrap justify-center gap-4"
        >
          <Link
            href="/depilation/booking"
            className="px-10 py-4 rounded-lg bg-gold-soft/20 border border-gold-soft/50 text-gold-soft font-medium tracking-wider uppercase hover:bg-gold-soft/30 hover:shadow-glow transition-all duration-300"
          >
            Book Depilation
          </Link>
          <Link
            href="/massage"
            className="text-icyWhite/50 hover:text-gold-soft text-sm tracking-[0.2em] uppercase transition-colors"
          >
            Explore Massage
          </Link>
        </motion.div>
      </section>
    </>
  );
}
