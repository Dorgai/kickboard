import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "KickStats | World Cup fan and analytics platform",
  description:
    "A Railway-ready KickStats scaffold for live match widgets, squad building, predictions, social features and safe analytics.",
  applicationName: "KickStats"
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
        {children}
      </body>
    </html>
  );
}
