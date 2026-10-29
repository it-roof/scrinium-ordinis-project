import type { Metadata } from "next";
import localFont from "next/font/local";

import { ThemeProvider } from "@/components/app/theme";

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
  title: "Matters · Scrinium",
  description: "Akten, Dokumente und KI am Fall",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="de"
      suppressHydrationWarning
      className={`${rga.variable} ${rgo.variable} h-full antialiased`}
    >
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `try{if(localStorage.getItem("matters-appearance")==="dark")document.documentElement.classList.add("dark")}catch(e){}`,
          }}
        />
      </head>
      <body className={`${rga.className} flex min-h-full flex-col bg-background text-foreground`}>
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}
