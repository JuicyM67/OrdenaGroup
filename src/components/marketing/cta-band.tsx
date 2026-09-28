// Mörkt CTA-band i botten av varje sida på sitio-webben (WP-hemsida). Samma markup som
// landningens tidigare inline "CTA final"-kort: mörkt hero-kort, centrerad text, en enda
// accent-knapp (regel: max en lime primärhandling per vy, DESIGN.md §2.3).
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export function CtaBand({
  title,
  text,
  buttonLabel,
  href,
}: {
  title: string;
  text: string;
  buttonLabel: string;
  href: string;
}) {
  return (
    <section className="mx-auto max-w-6xl px-4 py-14 sm:px-8">
      <Card
        tone="dark"
        radius="hero"
        padding="xl"
        className="flex flex-col items-center gap-5 text-center"
      >
        <h2 className="font-display text-28 font-bold tracking-display text-on-dark sm:text-32">
          {title}
        </h2>
        <p className="max-w-xl text-16 leading-relaxed text-on-dark-soft">
          {text}
        </p>
        <Button asChild variant="accent" size="xl">
          <Link href={href}>{buttonLabel}</Link>
        </Button>
      </Card>
    </section>
  );
}
