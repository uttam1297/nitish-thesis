import type { Metadata } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import type { ReactNode } from "react";

import { studyTitle } from "@/config/study";

import "./globals.css";

const interviewFont = Plus_Jakarta_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-interview",
  display: "swap",
});

export const metadata: Metadata = {
  title: studyTitle,
  description:
    "A static prototype for an expert research interview about digital customer discovery.",
};

interface RootLayoutProps {
  children: ReactNode;
}

export default function RootLayout({ children }: RootLayoutProps) {
  return (
    <html lang="en" className={interviewFont.variable}>
      <body>{children}</body>
    </html>
  );
}
