import type { Metadata } from "next";
import { Geist } from "next/font/google";

import { DashboardShell } from "@/components/dashboard-shell";

import "./globals.css";

// Self-hosted at build time by next/font, so there is no render-blocking
// request to Google and no layout shift when it lands.
const geist = Geist({ subsets: ["latin"], display: "swap" });

export const metadata: Metadata = {
  title: "Thesis Data Dashboard",
  description: "Read-only dashboard for thesis research data.",
  robots: { index: false, follow: false },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={geist.className}>
      <body>
        <DashboardShell>{children}</DashboardShell>
      </body>
    </html>
  );
}
