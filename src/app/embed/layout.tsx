// WP-82 (D-067): widgets som företag lägger på sin egen hemsida (iframes mot /embed/*).
// Minimalt skal: ingen sajtchrome, genomskinlig bakgrund (tokens.css, `data-embed-root`),
// noindex. Layouten och sidorna under läser inga kakor eller kundsession; den inbäddade
// bokningen anropar createBooking med `noAccount` så att inget kundkonto kopplas.
import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  robots: "noindex",
};

export default function EmbedLayout({ children }: { children: ReactNode }) {
  return <div data-embed-root>{children}</div>;
}
