import type { Transition, Variants } from "motion/react";

export const motionTransitions = {
  fast: { duration: 0.14, ease: [0.4, 0, 0.2, 1] } satisfies Transition,
  base: { duration: 0.22, ease: [0.4, 0, 0.2, 1] } satisfies Transition,
  emphasized: {
    duration: 0.36,
    ease: [0.16, 1, 0.3, 1],
  } satisfies Transition,
};

export const screenVariants: Variants = {
  initial: { opacity: 0, y: 10 },
  visible: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -8 },
};

export const reducedScreenVariants: Variants = {
  initial: { opacity: 0 },
  visible: { opacity: 1 },
  exit: { opacity: 0 },
};
