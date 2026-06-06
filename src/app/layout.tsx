import type { Metadata, Viewport } from "next";
import { Providers } from "@/components/providers";
import { themeInitScript, THEME_META_DARK } from "@/lib/theme";
import "./globals.css";

export const metadata: Metadata = {
  title: "Kickboard | World Cup fan and analytics platform",
  description:
    "World Cup predictions, Coach Board squads, and fan community on Kickboard.",
  applicationName: "Kickboard",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Kickboard"
  },
  formatDetection: {
    telephone: false
  }
};

export const viewport: Viewport = {
  themeColor: THEME_META_DARK,
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
        <meta content={THEME_META_DARK} name="theme-color" />
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
