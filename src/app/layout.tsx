import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "ScopeLedger — Know when to replace.",
    template: "%s · ScopeLedger",
  },
  description:
    "ScopeLedger tracks rigid endoscope repair spend, flags capital-replacement thresholds, and generates CFO-ready capital-request PDFs for hospital SPD managers.",
  metadataBase: new URL("https://scopeledger.io"),
  openGraph: {
    title: "ScopeLedger",
    description:
      "Repair-spend tracking and capital-replacement decision support for hospital sterile processing departments.",
    type: "website",
  },
  robots: { index: true, follow: true },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
