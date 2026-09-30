// /admin (F19/WP-36, D-038): yta bara för plattformsägaren, "dator först,
// fungerar på mobil" — enkel, ren design med befintliga token-baserade
// komponenter, ingen marknadsdesign (WP-36-planen). `noindex` sätts här som
// standard för HELA ytan; varje sida gör sin egen `requireAdminPage()`/
// `requireAdminAnyAal()`-kontroll (404/redirect), den här layouten
// innehåller ingen auktoriseringslogik.
import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "llena admin",
  robots: { index: false, follow: false, nocache: true },
};

export default function AdminLayout({ children }: { children: ReactNode }) {
  return <div className="min-h-dvh bg-canvas text-ink">{children}</div>;
}
