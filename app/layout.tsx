import { Analytics } from "@vercel/analytics/next";
import type { Metadata, Viewport } from "next";
import { Inter, STIX_Two_Text } from "next/font/google";
import { Shell } from "@/components/shell";
import "./globals.css";

// abbycare.org sets headings in STIX Two Text and everything else in Inter, both from Google Fonts.
const stix = STIX_Two_Text({ variable: "--font-stix", subsets: ["latin"], weight: ["400", "500"] });
const inter = Inter({ variable: "--font-inter", subsets: ["latin"] });

export const metadata: Metadata = {
  title: { default: "One Visit, Proven: an Abby Care concept", template: "%s · One Visit, Proven" },
  description:
    "An unofficial concept by Hafsa Usmani for Abby Care's Product Designer role: one family-led care visit, seen by the caregiver, the clinician and operations, driven by one tested state machine.",
  robots: { index: false, follow: false },
};

export const viewport: Viewport = { themeColor: "#081d4c" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${stix.variable} ${inter.variable} antialiased`}>
      <body className="font-sans text-[16px] leading-6">
        <Shell>{children}</Shell>
        <Analytics />
      </body>
    </html>
  );
}
