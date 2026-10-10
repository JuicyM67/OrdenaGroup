// BreadcrumbList som JSON-LD (WP-75). `<` escapas så att texten aldrig kan stänga taggen.
import { absoluteUrl } from "@/config/site-url";

export type Migas = readonly {
  readonly nombre: string;
  readonly href: string;
}[];

export function BreadcrumbJsonLd({ migas }: { migas: Migas }) {
  const data = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: migas.map((m, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: m.nombre,
      item: absoluteUrl(m.href),
    })),
  };
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{
        __html: JSON.stringify(data).replace(/</g, "\\u003c"),
      }}
    />
  );
}
