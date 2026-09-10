import type { SVGProps } from "react";

type LineArtProps = Omit<SVGProps<SVGSVGElement>, "viewBox" | "fill">;

/** Abstract nodes-and-paths mark: discovery as a network of connected signals. */
export function DiscoveryLineArt(props: LineArtProps) {
  return (
    <svg
      viewBox="0 0 240 200"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.4"
      strokeLinecap="round"
      aria-hidden="true"
      {...props}
    >
      <circle cx="120" cy="96" r="30" strokeDasharray="4 5" opacity="0.5" />
      <path d="M40 150c18-32 44-52 80-52s62 20 80 52" opacity="0.35" />
      <circle cx="120" cy="46" r="5" />
      <circle cx="60" cy="120" r="4" />
      <circle cx="180" cy="120" r="4" />
      <circle cx="120" cy="150" r="4" />
      <circle cx="70" cy="70" r="3" opacity="0.6" />
      <circle cx="170" cy="70" r="3" opacity="0.6" />
      <path d="M120 46 60 120" opacity="0.5" />
      <path d="M120 46 180 120" opacity="0.5" />
      <path d="M120 46 120 150" opacity="0.5" />
      <path d="M60 120 120 150" opacity="0.5" />
      <path d="M180 120 120 150" opacity="0.5" />
      <path d="M120 46 70 70" opacity="0.3" />
      <path d="M120 46 170 70" opacity="0.3" />
    </svg>
  );
}

/** Soft radiating checkmark mark for the completion screen. */
export function CompletionLineArt(props: LineArtProps) {
  return (
    <svg
      viewBox="0 0 240 160"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.4"
      strokeLinecap="round"
      aria-hidden="true"
      {...props}
    >
      <path d="M20 130c30-14 56-20 100-20s70 6 100 20" opacity="0.3" />
      <circle cx="60" cy="34" r="3" opacity="0.5" />
      <circle cx="184" cy="34" r="3" opacity="0.5" />
      <circle cx="30" cy="90" r="2.4" opacity="0.4" />
      <circle cx="212" cy="90" r="2.4" opacity="0.4" />
      <path d="M100 60c0-14 12-26 26-26" opacity="0.4" />
      <path d="M140 60c0-14-12-26-26-26" opacity="0.4" />
    </svg>
  );
}
