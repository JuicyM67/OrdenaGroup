import type { Metadata } from "next";

import { brand } from "@/config/brand";

import { display, sans } from "./fonts";
import "./globals.css";

export const metadata: Metadata = {
  title: brand.name,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang={process.env.NEXT_PUBLIC_MARKET === "SE" ? "sv" : "es-CL"}
      className={`${display.variable} ${sans.variable}`}
    >
      <body>{children}</body>
    </html>
  );
}
