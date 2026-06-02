import type { Metadata, Viewport } from "next";
import { Providers } from "@/components/providers";
import "./globals.css";

export const metadata: Metadata = {
  title: "Kickboard | World Cup fan and analytics platform",
  description:
    "A Railway-ready Kickboard scaffold for live match widgets, squad building, predictions, social features and safe analytics.",
  applicationName: "Kickboard"
};

export const viewport: Viewport = {
  themeColor: "#1A56DB",
  colorScheme: "light dark",
  width: "device-width",
  initialScale: 1
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <a className="skip-link" href="#main-content">
          Skip to main content
        </a>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
