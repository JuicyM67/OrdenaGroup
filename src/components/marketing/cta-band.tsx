// Mörkt CTA-band i botten av varje sida på sitio-webben (WP-hemsida). Samma markup som
// landningens tidigare inline "CTA final"-kort: mörkt hero-kort, centrerad text, en enda
// accent-knapp (regel: max en lime primärhandling per vy, DESIGN.md §2.3). `imageSrc`
// (WP-hemsida v2, punkt 8) lägger en bakgrundsbild bakom kortet med en mörk overlay
// (`bg-ink/55`, samma ink-ton som resten av mörka ytor — ingen ny hex). Fotot är redan
// mörkt/lågmält (tom barberia, kvällsljus), så 55 % räcker för att texten ska behålla
// AA-kontrast (`on-dark-soft` #D2D2D9 mot den mörka blandningen, gott om marginal över
// 4.5:1) utan att fotot försvinner helt bakom overlayen.
import Image from "next/image";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export function CtaBand({
  title,
  text,
  buttonLabel,
  href,
  imageSrc,
  imageAlt,
}: {
  title: string;
  text: string;
  buttonLabel: string;
  href: string;
  imageSrc?: string;
  imageAlt?: string;
}) {
  return (
    <section className="mx-auto max-w-6xl px-4 py-14 sm:px-8">
      <Card
        tone="dark"
        radius="hero"
        padding="xl"
        className="relative flex flex-col items-center gap-5 overflow-hidden text-center"
      >
        {imageSrc ? (
          <>
            <Image
              src={imageSrc}
              alt={imageAlt ?? ""}
              fill
              sizes="(min-width: 1152px) 1152px, 100vw"
              className="object-cover"
            />
            <div aria-hidden="true" className="absolute inset-0 bg-ink/55" />
          </>
        ) : null}
        <h2 className="relative font-display text-28 font-bold tracking-display text-on-dark sm:text-32">
          {title}
        </h2>
        <p className="relative max-w-xl text-16 leading-relaxed text-on-dark-soft">
          {text}
        </p>
        <Button asChild variant="accent" size="xl" className="relative">
          <Link href={href}>{buttonLabel}</Link>
        </Button>
      </Card>
    </section>
  );
}
