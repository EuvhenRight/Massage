"use client";

import Image from "next/image";
import { motion, useMotionTemplate, useMotionValue } from "framer-motion";
import { cn } from "@/lib/utils";

interface ServiceCardProps {
  title: string;
  description: string;
  price: string;
  image: string;
  index?: number;
}

export default function ServiceCard({
  title,
  description,
  price,
  image,
  index = 0,
}: ServiceCardProps) {
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);

  function handleMouseMove({
    currentTarget,
    clientX,
    clientY,
  }: React.MouseEvent<HTMLDivElement>) {
    const { left, top } = currentTarget.getBoundingClientRect();
    mouseX.set(clientX - left);
    mouseY.set(clientY - top);
  }

  const glowStyle = useMotionTemplate`radial-gradient(300px circle at ${mouseX}px ${mouseY}px, rgba(212, 175, 55, 0.15), transparent 80%)`;

  return (
    <motion.article
      initial={{ opacity: 0, y: 40 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-50px" }}
      transition={{ duration: 0.6, delay: index * 0.1 }}
      onMouseMove={handleMouseMove}
      className={cn(
        "group relative overflow-hidden rounded-2xl border border-white/5",
        "bg-nearBlack/80 backdrop-blur-sm",
        "transition-all duration-500 hover:border-gold-soft/30 hover:shadow-card-hover",
        "cursor-default"
      )}
      style={{
        transform: "perspective(1000px)",
      }}
    >
      {/* Glow effect on hover */}
      <motion.div
        className="pointer-events-none absolute -inset-px rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500"
        style={{ background: glowStyle }}
      />

      {/* Tilt effect via transform on hover */}
      <motion.div
        className="relative z-10"
        whileHover={{
          scale: 1.01,
          transition: { duration: 0.3 },
        }}
      >
        <div className="aspect-[4/3] relative overflow-hidden">
          <Image
            src={image}
            alt={title}
            fill
            className="object-cover transition-transform duration-700 group-hover:scale-105"
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-nearBlack via-nearBlack/20 to-transparent" />
          <div className="absolute bottom-4 left-6 right-6">
            <span className="text-gold-soft text-sm font-medium tracking-wider">
              {price}
            </span>
          </div>
        </div>
        <div className="p-6">
          <h3 className="font-serif text-2xl text-icyWhite mb-2">{title}</h3>
          <p className="text-icyWhite/70 text-sm leading-relaxed">
            {description}
          </p>
        </div>
      </motion.div>
    </motion.article>
  );
}
