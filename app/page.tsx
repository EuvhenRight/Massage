"use client";

import Link from "next/link";
import { motion } from "framer-motion";

export default function EntryPortal() {
  return (
    <main
      className="min-h-screen flex flex-col md:flex-row"
      role="main"
      aria-label="Choose your experience"
    >
      {/* Massage Option */}
      <motion.div
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
        className="flex-1 min-h-[50vh] md:min-h-screen relative group overflow-hidden"
      >
        <Link
          href="/massage"
          className="block absolute inset-0 flex flex-col items-center justify-center bg-nearBlack border-r border-white/5 hover:border-gold-soft/30 transition-colors duration-500"
          aria-label="Enter Massage experience"
        >
          <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1544161515-4ab6ce6db874?w=1920')] bg-cover bg-center opacity-30 group-hover:opacity-40 transition-opacity duration-700" />
          <div className="absolute inset-0 bg-gradient-to-b from-nearBlack/60 via-nearBlack/40 to-nearBlack" />
          <motion.h1
            className="relative z-10 font-serif text-5xl md:text-7xl lg:text-8xl font-normal text-icyWhite tracking-tight"
            whileHover={{ scale: 1.02 }}
          >
            Massage
          </motion.h1>
          <motion.span
            className="relative z-10 mt-4 text-icyWhite/70 text-sm tracking-[0.3em] uppercase"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
          >
            Enter
          </motion.span>
          <div className="absolute bottom-8 left-1/2 -translate-x-1/2 w-px h-12 bg-gradient-to-b from-transparent via-gold-soft/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
        </Link>
      </motion.div>

      {/* Divider - Visible on desktop */}
      <div
        className="hidden md:block w-px bg-gradient-to-b from-transparent via-white/10 to-transparent"
        aria-hidden
      />

      {/* Depilation Option */}
      <motion.div
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.8, ease: "easeOut", delay: 0.2 }}
        className="flex-1 min-h-[50vh] md:min-h-screen relative group overflow-hidden"
      >
        <Link
          href="/depilation"
          className="block absolute inset-0 flex flex-col items-center justify-center bg-nearBlack hover:border-gold-soft/30 transition-colors duration-500 border-t md:border-t-0 md:border-l border-white/5"
          aria-label="Enter Depilation experience"
        >
          <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1519824145371-296894a0daa9?w=1920')] bg-cover bg-center opacity-30 group-hover:opacity-40 transition-opacity duration-700" />
          <div className="absolute inset-0 bg-gradient-to-b from-nearBlack/60 via-nearBlack/40 to-nearBlack" />
          <motion.h1
            className="relative z-10 font-serif text-5xl md:text-7xl lg:text-8xl font-normal text-icyWhite tracking-tight"
            whileHover={{ scale: 1.02 }}
          >
            Depilation
          </motion.h1>
          <motion.span
            className="relative z-10 mt-4 text-icyWhite/70 text-sm tracking-[0.3em] uppercase"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.7 }}
          >
            Enter
          </motion.span>
          <div className="absolute bottom-8 left-1/2 -translate-x-1/2 w-px h-12 bg-gradient-to-b from-transparent via-gold-soft/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
        </Link>
      </motion.div>
    </main>
  );
}
