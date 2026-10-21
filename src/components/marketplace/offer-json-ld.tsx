// JSON-LD för erbjudandesidan (WP-68): `Offer` med säljaren som `LocalBusiness`
// (adress, `geo`) och `AggregateRating` bara när det finns synliga recensioner
// (D-045). Inget pris, ingen valuta och ingen `availability`: erbjudandet går inte
// att köpa online, och sidan ska inte lova något som inte kan köpas (K8). `<`
// escapas så att texten aldrig kan stänga taggen.
import { absoluteUrl } from "@/config/site-url";
import type { OfferDetail } from "@/server/marketplace/public";

export function offerJsonLd(
  offer: OfferDetail,
  url: string,
  businessUrl: string,
): Record<string, unknown> {
  const business: Record<string, unknown> = {
    "@type": "LocalBusiness",
    name: offer.business.name,
    url: absoluteUrl(businessUrl),
    ...(offer.business.address
      ? {
          address: {
            "@type": "PostalAddress",
            streetAddress: offer.business.address,
            addressLocality: offer.business.areaName ?? offer.business.comuna,
            addressCountry: offer.currency === "SEK" ? "SE" : "CL",
          },
        }
      : {}),
    ...(offer.business.lat !== null && offer.business.lng !== null
      ? {
          geo: {
            "@type": "GeoCoordinates",
            latitude: offer.business.lat,
            longitude: offer.business.lng,
          },
        }
      : {}),
    ...(offer.rating
      ? {
          aggregateRating: {
            "@type": "AggregateRating",
            ratingValue: offer.rating.average,
            reviewCount: offer.rating.count,
            bestRating: 5,
            worstRating: 1,
          },
        }
      : {}),
  };
  return {
    "@context": "https://schema.org",
    "@type": "Offer",
    name: offer.title,
    ...(offer.description ? { description: offer.description } : {}),
    url: absoluteUrl(url),
    ...(offer.imageUrl
      ? {
          image: /^https?:\/\//.test(offer.imageUrl)
            ? offer.imageUrl
            : absoluteUrl(offer.imageUrl),
        }
      : {}),
    ...(offer.publishedAt ? { validFrom: offer.publishedAt } : {}),
    category: offer.serviceName,
    itemOffered: {
      "@type": "Service",
      name: offer.serviceName,
      provider: { "@type": "LocalBusiness", name: offer.business.name },
    },
    seller: business,
  };
}

export function OfferJsonLd({ data }: { data: Record<string, unknown> }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{
        __html: JSON.stringify(data).replace(/</g, "\\u003c"),
      }}
    />
  );
}
