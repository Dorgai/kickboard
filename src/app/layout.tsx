import type { Metadata, Viewport } from "next";
import { Providers } from "@/components/providers";
import { themeInitScript } from "@/lib/theme";
import "./globals.css";

export const metadata: Metadata = {
  title: "Kickboard | World Cup fan and analytics platform",
  description:
    "A Railway-ready Kickboard scaffold for live match widgets, squad building, predictions, social features and safe analytics.",
  applicationName: "Kickboard",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    title: "Kickboard",
    statusBarStyle: "default"
  },
  icons: {
    icon: [{ url: "/icon", type: "image/png" }],
    apple: [{ url: "/apple-icon", type: "image/png" }]
  }
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
    <html lang="en" suppressHydrationWarning>
      <head>
        <meta content="#1A56DB" name="theme-color" />
        <meta content="yes" name="mobile-web-app-capable" />
        <meta content="yes" name="apple-mobile-web-app-capable" />
        <meta content="default" name="apple-mobile-web-app-status-bar-style" />
        <link href="/manifest.webmanifest" rel="manifest" />
        <link href="/logo.svg" rel="icon" type="image/svg+xml" />
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
