import type { Metadata } from "next";

import "./globals.css";

export const metadata: Metadata = {
  title: "Thesis Data Dashboard",
  description: "Read-only dashboard for thesis research data.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
