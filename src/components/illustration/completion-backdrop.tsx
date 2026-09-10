"use client";

import { motion, useReducedMotion } from "motion/react";
import { useEffect, useRef, useState } from "react";

const emphasizedEase = [0.16, 1, 0.3, 1] as const;

const LEFT_ROUTE =
  "M24 760C92 704 176 650 154 566C132 482 70 438 94 354C116 282 150 246 190 220";
const RIGHT_ROUTE =
  "M1416 760C1348 704 1264 650 1286 566C1308 482 1370 438 1346 354C1324 282 1290 246 1250 220";

interface Point {
  x: number;
  y: number;
}

const START_POINTS = {
  left: { x: 24, y: 760 },
  right: { x: 1416, y: 760 },
};

const MILESTONES: Array<{ progress: number; left: Point }> = [
  { progress: 0.12, left: { x: 78, y: 704 } },
  { progress: 0.3, left: { x: 154, y: 590 } },
  { progress: 0.48, left: { x: 126, y: 480 } },
  { progress: 0.66, left: { x: 91, y: 375 } },
  { progress: 0.84, left: { x: 133, y: 278 } },
  { progress: 1, left: { x: 190, y: 220 } },
];

interface CompletionBackdropProps {
  progress: number;
  isComplete: boolean;
}

/**
 * A progress-driven interview journey. The two routes draw forward only as
 * questions are completed, illuminate milestones along the way, and meet
 * behind the confirmation mark when the interview is submitted.
 */
export function CompletionBackdrop({
  progress,
  isComplete,
}: CompletionBackdropProps) {
  const reduceMotion = useReducedMotion();
  const leftRouteRef = useRef<SVGPathElement>(null);
  const rightRouteRef = useRef<SVGPathElement>(null);
  const [signalPoints, setSignalPoints] = useState(START_POINTS);
  const journeyProgress = Math.min(1, Math.max(0.035, progress / 100));

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      const leftRoute = leftRouteRef.current;
      const rightRoute = rightRouteRef.current;
      if (!leftRoute || !rightRoute) return;

      const left = leftRoute.getPointAtLength(
        leftRoute.getTotalLength() * journeyProgress
      );
      const right = rightRoute.getPointAtLength(
        rightRoute.getTotalLength() * journeyProgress
      );
      setSignalPoints({
        left: { x: left.x, y: left.y },
        right: { x: right.x, y: right.y },
      });
    });

    return () => window.cancelAnimationFrame(frame);
  }, [journeyProgress]);

  const routeTransition = {
    duration: reduceMotion ? 0 : 0.9,
    ease: emphasizedEase,
  };

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 overflow-hidden"
    >
      <div className="absolute top-1/2 left-1/2 size-[min(52rem,82vw)] -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary/[0.022] blur-3xl" />

      <svg
        viewBox="0 0 1440 900"
        preserveAspectRatio="xMidYMid slice"
        fill="none"
        className="absolute inset-0 hidden size-full text-primary/24 sm:block"
      >
        <g stroke="currentColor" strokeLinecap="round">
          <path
            ref={leftRouteRef}
            d={LEFT_ROUTE}
            strokeWidth="1.2"
            strokeDasharray="3 10"
            opacity="0.16"
          />
          <path
            ref={rightRouteRef}
            d={RIGHT_ROUTE}
            strokeWidth="1.2"
            strokeDasharray="3 10"
            opacity="0.16"
          />

          <motion.path
            d={LEFT_ROUTE}
            strokeWidth="2"
            initial={false}
            animate={{
              pathLength: journeyProgress,
              opacity: isComplete ? 0.24 : 0.66,
            }}
            transition={routeTransition}
          />
          <motion.path
            d={RIGHT_ROUTE}
            strokeWidth="2"
            initial={false}
            animate={{
              pathLength: journeyProgress,
              opacity: isComplete ? 0.24 : 0.66,
            }}
            transition={routeTransition}
          />
        </g>

        {MILESTONES.map((milestone, index) => {
          const reached = journeyProgress >= milestone.progress;
          const rightX = 1440 - milestone.left.x;

          return (
            <g key={milestone.progress}>
              <motion.circle
                cx={milestone.left.x}
                cy={milestone.left.y}
                r="7"
                fill="var(--background)"
                stroke="currentColor"
                strokeWidth="1.4"
                initial={false}
                animate={{
                  r: reached ? 7 : 4.5,
                  opacity: reached ? 0.72 : 0.2,
                }}
                transition={{
                  duration: reduceMotion ? 0 : 0.35,
                  delay: reached && !reduceMotion ? index * 0.025 : 0,
                }}
              />
              <motion.circle
                cx={rightX}
                cy={milestone.left.y}
                r="7"
                fill="var(--background)"
                stroke="currentColor"
                strokeWidth="1.4"
                initial={false}
                animate={{
                  r: reached ? 7 : 4.5,
                  opacity: reached ? 0.72 : 0.2,
                }}
                transition={{
                  duration: reduceMotion ? 0 : 0.35,
                  delay: reached && !reduceMotion ? index * 0.025 : 0,
                }}
              />
              {reached && (
                <>
                  <circle
                    cx={milestone.left.x}
                    cy={milestone.left.y}
                    r="2.3"
                    fill="currentColor"
                    opacity="0.68"
                  />
                  <circle
                    cx={rightX}
                    cy={milestone.left.y}
                    r="2.3"
                    fill="currentColor"
                    opacity="0.68"
                  />
                </>
              )}
            </g>
          );
        })}

        {!isComplete && (
          <g fill="currentColor">
            <motion.circle
              r="11"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.2"
              initial={false}
              animate={{
                cx: signalPoints.left.x,
                cy: signalPoints.left.y,
                r: reduceMotion ? 9 : [8, 13, 8],
                opacity: reduceMotion ? 0.24 : [0.3, 0.08, 0.3],
              }}
              transition={{
                cx: routeTransition,
                cy: routeTransition,
                r: { duration: 2.4, repeat: Infinity, ease: "easeInOut" },
                opacity: {
                  duration: 2.4,
                  repeat: Infinity,
                  ease: "easeInOut",
                },
              }}
            />
            <motion.circle
              r="11"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.2"
              initial={false}
              animate={{
                cx: signalPoints.right.x,
                cy: signalPoints.right.y,
                r: reduceMotion ? 9 : [8, 13, 8],
                opacity: reduceMotion ? 0.24 : [0.3, 0.08, 0.3],
              }}
              transition={{
                cx: routeTransition,
                cy: routeTransition,
                r: {
                  duration: 2.4,
                  delay: 0.35,
                  repeat: Infinity,
                  ease: "easeInOut",
                },
                opacity: {
                  duration: 2.4,
                  delay: 0.35,
                  repeat: Infinity,
                  ease: "easeInOut",
                },
              }}
            />
            <motion.circle
              r="4.5"
              initial={false}
              animate={{
                cx: signalPoints.left.x,
                cy: signalPoints.left.y,
                opacity: 0.9,
              }}
              transition={{ cx: routeTransition, cy: routeTransition }}
            />
            <motion.circle
              r="4.5"
              initial={false}
              animate={{
                cx: signalPoints.right.x,
                cy: signalPoints.right.y,
                opacity: 0.9,
              }}
              transition={{ cx: routeTransition, cy: routeTransition }}
            />
          </g>
        )}

        {isComplete && (
          <g stroke="currentColor" strokeLinecap="round">
            <motion.circle
              cx="190"
              cy="220"
              r="5"
              fill="currentColor"
              strokeWidth="0"
              initial={reduceMotion ? false : { opacity: 0.95 }}
              animate={
                reduceMotion
                  ? { cx: 720, cy: 334, opacity: 0 }
                  : {
                      cx: [190, 370, 548, 652, 720],
                      cy: [220, 258, 302, 323, 334],
                      opacity: [0.95, 1, 1, 1, 0],
                    }
              }
              transition={{ duration: 1.08, ease: emphasizedEase }}
            />
            <motion.circle
              cx="1250"
              cy="220"
              r="5"
              fill="currentColor"
              strokeWidth="0"
              initial={reduceMotion ? false : { opacity: 0.95 }}
              animate={
                reduceMotion
                  ? { cx: 720, cy: 334, opacity: 0 }
                  : {
                      cx: [1250, 1068, 900, 790, 720],
                      cy: [220, 190, 224, 294, 334],
                      opacity: [0.95, 1, 1, 1, 0],
                    }
              }
              transition={{ duration: 1.08, ease: emphasizedEase }}
            />
            <motion.circle
              cx="720"
              cy="334"
              fill="none"
              initial={reduceMotion ? false : { r: 7, opacity: 0.48 }}
              animate={{ r: 78, opacity: 0 }}
              transition={{
                duration: reduceMotion ? 0 : 1.1,
                delay: reduceMotion ? 0 : 0.92,
                ease: "easeOut",
              }}
            />
            <motion.circle
              cx="720"
              cy="334"
              fill="none"
              initial={reduceMotion ? false : { r: 7, opacity: 0.28 }}
              animate={{ r: 112, opacity: 0 }}
              transition={{
                duration: reduceMotion ? 0 : 1.3,
                delay: reduceMotion ? 0 : 1.04,
                ease: "easeOut",
              }}
            />
          </g>
        )}
      </svg>
    </div>
  );
}
