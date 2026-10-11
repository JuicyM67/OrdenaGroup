// Typer för erbjudanderedigeraren (WP-70, D-056). Speglar `src/server/marketplace/owner.ts`
// utan att importera servermodulen i klientkoden.
import type { LocalDate } from "@/lib/format/dates";

export type OfferStatus = "draft" | "published" | "paused" | "ended";

export type EditorOffer = {
  id: string;
  slug: string;
  serviceId: string;
  serviceName: string;
  title: string;
  description: string;
  includes: string[];
  terms: string;
  category: string;
  offerPriceMinor: number;
  regularPriceMinor: number;
  status: OfferStatus;
  quantityTotal: number | null;
  quantitySold: number;
  saleStartsOn: LocalDate | null;
  saleEndsOn: LocalDate | null;
  validMonths: number;
  imageUrl: string | null;
  publishedAt: string | null;
};

export type EditorService = {
  id: string;
  name: string;
  priceMinor: number;
  lowestMinor: number;
  priceLocked: boolean;
};

export type OfferActionResult = { ok: true } | { ok: false; code: string };

export type OffersActions = {
  save: (
    offerId: string | null,
    input: unknown,
  ) => Promise<{ ok: true; id: string } | { ok: false; code: string }>;
  setStatus: (
    offerId: string,
    status: "published" | "paused",
  ) => Promise<OfferActionResult>;
  createImageUpload: (
    input: unknown,
  ) => Promise<
    | { ok: true; path: string; signedUrl: string; token: string }
    | { ok: false; code: string }
  >;
};
