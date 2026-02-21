"use client";

import { motion } from "framer-motion";

const MAPS_URL = "https://maps.google.com/?q=spa+salon";

export default function FloatingCTA() {
  return (
    <motion.a
      href={MAPS_URL}
      target="_blank"
      rel="noopener noreferrer"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 1 }}
      className="md:hidden fixed bottom-6 left-6 right-6 z-40 flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-gold-soft/20 border border-gold-soft/40 text-gold-soft font-medium text-sm tracking-wider uppercase shadow-glow"
      aria-label="Get directions to Aurora Salon"
    >
      <svg
        className="w-5 h-5"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
        aria-hidden
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
        />
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
        />
      </svg>
      Get Directions
    </motion.a>
  );
}
