import type { Metadata } from "next";
import type { ReactNode } from "react";

import { studyTitle } from "@/config/study";

import "./globals.css";

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
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
