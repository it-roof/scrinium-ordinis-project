import { KANZLEI_NAME, SITE_NAME, SITE_TAGLINE } from "@scrinium/brand";
import type { Metadata } from "next";
import localFont from "next/font/local";

import { SiteHeader } from "@/components/layout/site-header";
import { ThemeProvider } from "@/components/theme/theme-provider";

import "./globals.css";

const rga = localFont({
  src: [
    {
      path: "../public/font/RGa-Book.woff2",
      weight: "400 500",
      style: "normal",
    },
    {
      path: "../public/font/RGa-Bold.woff2",
      weight: "600 700",
      style: "normal",
    },
  ],
  variable: "--font-rga",
  display: "swap",
});

const rgo = localFont({
  src: [
    {
      path: "../public/font/RGo-Book.woff2",
      weight: "400 500",
      style: "normal",
    },
    {
      path: "../public/font/RGo-Bold.woff2",
      weight: "600 700",
      style: "normal",
    },
  ],
  variable: "--font-rgo",
  display: "swap",
});

export const metadata: Metadata = {
  title: `${SITE_NAME} – ${KANZLEI_NAME}`,
  description: SITE_TAGLINE,
};

const appearanceInitScript = `(function(){try{var k="website-appearance";var v=localStorage.getItem(k);if(v==="dark")document.documentElement.classList.add("dark");else document.documentElement.classList.remove("dark");}catch(e){}})();`;

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="de"
      className={`${rga.variable} ${rgo.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: appearanceInitScript }} />
      </head>
      <body className={`${rga.className} flex min-h-full flex-col`}>
        <ThemeProvider>
          <SiteHeader />
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
