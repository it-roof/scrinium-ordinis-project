import { Manrope } from "next/font/google";
import type { ReactNode } from "react";

import "./brand-lab.css";

/**
 * Alba Manrope — Variable Font ohne weight-Array (Turbopack-sicher).
 */

const manrope = Manrope({
  subsets: ["latin"],
  variable: "--font-alba-manrope",
  display: "swap",
});

export default function DesignLabLayout({ children }: { children: ReactNode }) {
  return <div className={manrope.variable}>{children}</div>;
}
