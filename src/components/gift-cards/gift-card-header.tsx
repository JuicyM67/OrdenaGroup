// WP-77 (D-058): sidhuvudet på köp- och klar-sidan (designen
// `presentkort/Main.dc.html` + `Mobil.dc.html`): omslagsbilden under en mörk
// toning, "Tillbaka till {företag}", etikett, rubrik och (desktop) ingress.
import { ChevronLeft } from "lucide-react";
import Link from "next/link";

export function GiftCardHeader({
  coverUrl,
  backHref,
  backLabel,
  backLabelShort,
  eyebrow,
  title,
  lead,
}: {
  coverUrl: string | null;
  backHref: string;
  backLabel: string;
  backLabelShort: string;
  eyebrow: string;
  title: string;
  lead: string;
}) {
  return (
    <header className="relative h-57.5 overflow-hidden bg-dark lg:h-65">
      {coverUrl ? (
        // eslint-disable-next-line @next/next/no-img-element -- omslagsbilden, redan optimerad i bucketen
        <img
          src={coverUrl}
          alt=""
          className="absolute inset-0 size-full object-cover"
        />
      ) : null}
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-linear-to-b from-ink/35 to-ink/85 lg:bg-linear-to-r lg:from-ink/80 lg:to-ink/35"
      />
      <div className="relative mx-auto flex max-w-300 flex-col gap-11.5 p-4 text-on-dark lg:gap-7 lg:px-10 lg:pt-8">
        <Link
          href={backHref}
          aria-label={backLabelShort}
          className="flex size-11 items-center justify-center self-start rounded-full border border-on-dark/30 bg-on-dark/15 text-14 font-semibold text-on-dark focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-on-dark lg:size-auto lg:gap-2 lg:px-4.5 lg:py-2.5"
        >
          <ChevronLeft aria-hidden="true" className="size-4.5 lg:size-4" />
          <span className="hidden lg:inline">{backLabel}</span>
        </Link>
        <div className="flex flex-col gap-1.5 lg:gap-2.5">
          <span className="text-12 font-bold tracking-caps text-lime uppercase lg:text-13">
            {eyebrow}
          </span>
          <h1 className="font-display text-30 leading-hero font-extrabold tracking-display lg:text-52 lg:leading-none">
            {title}
          </h1>
          <p className="hidden text-17 text-on-dark-soft lg:block">{lead}</p>
        </div>
      </div>
    </header>
  );
}
