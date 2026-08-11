import { KANZLEI_NAME } from "@/lib/brand";
import type { Metadata } from "next";
import localFont from "next/font/local";
import { Toaster } from "sonner";
import "./globals.css";

const rga = localFont({
  src: [
    {
      path: "../public/font/RGa-Book.woff2",
      weight: "400",
      style: "normal",
    },
    {
      path: "../public/font/RGa-Bold.woff2",
      weight: "700",
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
      weight: "400",
      style: "normal",
    },
    {
      path: "../public/font/RGo-Bold.woff2",
      weight: "700",
      style: "normal",
    },
  ],
  variable: "--font-rgo",
  display: "swap",
});

export const metadata: Metadata = {
  title: `ORGA. – ${KANZLEI_NAME}`,
  description: "Internes Kanzlei-Werkzeug für Dokumentation und Arbeitsfunktionen",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="de"
      className={`${rga.variable} ${rgo.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col">
        {children}
        <Toaster richColors position="top-right" />
      </body>
    </html>
  );
}
