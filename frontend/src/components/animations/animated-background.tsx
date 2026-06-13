"use client";

import { motion } from "motion/react";

import { cn } from "@/lib/utils";

interface AnimatedBackgroundProps {
  className?: string;
}

export function AnimatedBackground({ className }: AnimatedBackgroundProps) {
  return (
    <div className={cn("pointer-events-none absolute inset-0 overflow-hidden", className)} aria-hidden="true">
      <motion.div
        className="absolute -left-1/4 top-0 size-[28rem] rounded-full bg-primary/30 blur-3xl"
        animate={{ x: [0, 60, -40, 0], y: [0, 40, -20, 0] }}
        transition={{ duration: 24, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="absolute right-0 top-1/3 size-[24rem] rounded-full bg-accent/25 blur-3xl"
        animate={{ x: [0, -50, 30, 0], y: [0, -30, 50, 0] }}
        transition={{ duration: 28, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="absolute bottom-0 left-1/3 size-[26rem] rounded-full bg-secondary/25 blur-3xl"
        animate={{ x: [0, 40, -60, 0], y: [0, -40, 20, 0] }}
        transition={{ duration: 32, repeat: Infinity, ease: "easeInOut" }}
      />
    </div>
  );
}
