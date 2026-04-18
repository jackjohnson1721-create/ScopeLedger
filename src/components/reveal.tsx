"use client";

import { motion } from "motion/react";
import type { PropsWithChildren } from "react";

export function Reveal({
  children,
  delay = 0,
}: PropsWithChildren<{ delay?: number }>) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: "easeOut", delay }}
    >
      {children}
    </motion.div>
  );
}
