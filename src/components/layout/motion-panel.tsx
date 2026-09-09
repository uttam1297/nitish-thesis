"use client";

import { motion, useReducedMotion } from "motion/react";
import { useEffect, useRef, type ReactNode } from "react";

import {
  motionTransitions,
  reducedScreenVariants,
  screenVariants,
} from "@/lib/motion";

interface MotionPanelProps {
  children: ReactNode;
  screenKey: string;
}

export function MotionPanel({ children, screenKey }: MotionPanelProps) {
  const reduceMotion = useReducedMotion();
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    panelRef.current?.focus({ preventScroll: true });
    window.scrollTo({ top: 0, behavior: "auto" });
  }, [screenKey]);

  return (
    <motion.div
      ref={panelRef}
      key={screenKey}
      tabIndex={-1}
      data-motion={reduceMotion ? "reduced" : "standard"}
      variants={reduceMotion ? reducedScreenVariants : screenVariants}
      initial="initial"
      animate="visible"
      exit="exit"
      transition={motionTransitions.base}
      className="w-full focus:outline-none"
    >
      {children}
    </motion.div>
  );
}
