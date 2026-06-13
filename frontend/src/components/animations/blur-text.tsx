"use client";

import { motion } from "motion/react";

import { cn } from "@/lib/utils";

interface BlurTextProps {
  text: string;
  className?: string;
  delay?: number;
  animateBy?: "words" | "characters";
  direction?: "top" | "bottom";
}

export function BlurText({ text, className, delay = 60, animateBy = "words", direction = "top" }: BlurTextProps) {
  const segments = animateBy === "words" ? text.split(" ") : text.split("");
  const offset = direction === "top" ? -12 : 12;

  return (
    <span className={cn("inline-flex flex-wrap", className)}>
      {segments.map((segment, index) => (
        <motion.span
          key={`${segment}-${index}`}
          initial={{ filter: "blur(10px)", opacity: 0, y: offset }}
          animate={{ filter: "blur(0px)", opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: (index * delay) / 1000, ease: "easeOut" }}
          className="inline-block"
        >
          {segment}
          {animateBy === "words" && index < segments.length - 1 ? " " : ""}
        </motion.span>
      ))}
    </span>
  );
}
