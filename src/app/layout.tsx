import type { Metadata, Viewport } from "next";
import { Providers } from "@/components/providers";
import { SkipLink } from "@/components/skip-link";
import { BRAND } from "@/lib/brand";
import { themeInitScript, THEME_META_LIGHT } from "@/lib/theme";
import "./globals.css";

export const metadata: Metadata = {
  title: BRAND.pageTitle,
  description: BRAND.tagline,
  applicationName: BRAND.name,
  metadataBase: new URL(BRAND.url),
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: BRAND.name
  },
  formatDetection: {
    telephone: false
  }
};

export const viewport: Viewport = {
  themeColor: THEME_META_LIGHT,
  colorScheme: "light dark",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover"
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
        <Providers>
          <SkipLink />
          {children}
        </Providers>
      </body>
    </html>
  );
}
