"use client";

import { useEffect, useRef } from "react";
import { animate, useInView } from "motion/react";

interface CountUpProps {
  value: number;
  duration?: number;
  decimals?: number;
  prefix?: string;
  suffix?: string;
  separator?: string;
  className?: string;
}

export function CountUp({
  value,
  duration = 1,
  decimals = 0,
  prefix = "",
  suffix = "",
  separator = ",",
  className,
}: CountUpProps) {
  const ref = useRef<HTMLSpanElement>(null);
  const isInView = useInView(ref, { once: true, margin: "-10% 0px" });

  useEffect(() => {
    if (!isInView || !ref.current) return;

    const node = ref.current;
    const controls = animate(0, value, {
      duration,
      ease: "easeOut",
      onUpdate(latest) {
        const formatted = latest.toFixed(decimals);
        const [intPart, decPart] = formatted.split(".");
        const withSeparators = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, separator);
        node.textContent = `${prefix}${withSeparators}${decPart ? `.${decPart}` : ""}${suffix}`;
      },
    });

    return () => controls.stop();
  }, [isInView, value, duration, decimals, prefix, suffix, separator]);

  return (
    <span ref={ref} className={className}>
      {prefix}0{suffix}
    </span>
  );
}
