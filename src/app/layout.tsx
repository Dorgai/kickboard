import type { Metadata, Viewport } from "next";
import { Providers } from "@/components/providers";
import { themeInitScript, THEME_META_LIGHT } from "@/lib/theme";
import "./globals.css";

export const metadata: Metadata = {
  title: "Kickboard | World Cup fan and analytics platform",
  description:
    "A Railway-ready Kickboard scaffold for live match widgets, squad building, predictions, social features and safe analytics.",
  applicationName: "Kickboard"
};

export const viewport: Viewport = {
  themeColor: THEME_META_LIGHT,
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
    <html lang="en" suppressHydrationWarning>
      <head>
        <meta content={THEME_META_LIGHT} name="theme-color" />
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body>
        <a className="skip-link" href="#main-content">
          Skip to main content
        </a>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
