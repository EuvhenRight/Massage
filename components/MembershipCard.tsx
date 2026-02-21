"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface MembershipCardProps {
  tier: "Silver" | "Black" | "Obsidian";
  price: string;
  features: string[];
  highlighted?: boolean;
  index?: number;
}

const tierStyles = {
  Silver: {
    border: "border-white/10",
    hover: "hover:border-white/30",
    accent: "text-icyWhite/90",
    gradient: "from-white/5 to-transparent",
  },
  Black: {
    border: "border-gold-soft/40",
    hover: "hover:border-gold-soft/60",
    accent: "text-gold-soft",
    gradient: "from-gold-soft/10 to-transparent",
  },
  Obsidian: {
    border: "border-aurora-magenta/40",
    hover: "hover:border-aurora-magenta/60",
    accent: "text-aurora-magenta",
    gradient: "from-aurora-magenta/10 to-transparent",
  },
};

export default function MembershipCard({
  tier,
  price,
  features,
  highlighted = false,
  index = 0,
}: MembershipCardProps) {
  const styles = tierStyles[tier];

  return (
    <motion.article
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-50px" }}
      transition={{ duration: 0.5, delay: index * 0.15 }}
      className={cn(
        "relative overflow-hidden rounded-2xl border backdrop-blur-sm",
        "bg-gradient-to-b",
        styles.gradient,
        styles.border,
        styles.hover,
        "transition-all duration-500",
        highlighted && "ring-1 ring-gold-soft/30 shadow-glow"
      )}
    >
      <div className="p-8 lg:p-10">
        {highlighted && (
          <span className="absolute top-4 right-4 text-xs tracking-[0.2em] uppercase text-gold-soft">
            Most Popular
          </span>
        )}
        <h3
          className={cn(
            "font-serif text-3xl mb-2",
            styles.accent
          )}
        >
          {tier}
        </h3>
        <p className="text-4xl font-light text-icyWhite mb-6">{price}</p>
        <ul className="space-y-3" role="list">
          {features.map((feature, i) => (
            <li
              key={i}
              className="flex items-start gap-3 text-icyWhite/80 text-sm"
            >
              <span
                className={cn(
                  "mt-1.5 w-1.5 h-1.5 rounded-full shrink-0",
                  tier === "Silver" && "bg-white/60",
                  tier === "Black" && "bg-gold-soft",
                  tier === "Obsidian" && "bg-aurora-magenta"
                )}
              />
              {feature}
            </li>
          ))}
        </ul>
        <motion.button
          type="button"
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          className={cn(
            "mt-8 w-full py-3 px-6 rounded-lg font-medium text-sm tracking-wider uppercase transition-all duration-300",
            tier === "Silver" &&
              "bg-white/10 text-icyWhite hover:bg-white/20",
            tier === "Black" &&
              "bg-gold-soft/20 text-gold-soft border border-gold-soft/40 hover:bg-gold-soft/30 hover:shadow-glow",
            tier === "Obsidian" &&
              "bg-aurora-magenta/20 text-aurora-magenta border border-aurora-magenta/40 hover:bg-aurora-magenta/30"
          )}
          aria-label={`Select ${tier} membership`}
        >
          Select
        </motion.button>
      </div>
    </motion.article>
  );
}
