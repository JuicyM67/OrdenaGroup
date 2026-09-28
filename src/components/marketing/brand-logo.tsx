// Logga per marknad (WP-hemsida, retro: footer + startsida klara). CL behåller den
// befintliga lime-cirkeln (`LogoMark`) + varumärkesnamnet i löptext, precis som headern
// hade inline sedan tidigare. SE använder ordmärket från `.visual-diff/ref/logo-bb-vald.png`
// ("5 · ORDMÄRKE MED ÖGON" i `logo-bb.html`): "Booking" i ink med en pupill i ett av de två
// "o":na, "Buddy" på en lime rundad platta. Namnet skrivs aldrig ut här (regel dura 10) —
// `brand.name` delas upp i ord (`words[0]`/`words[1]`), och pupillen letar rätt på "oo" i
// `words[0]` i stället för att anta att det alltid är "Booking". Används i headern,
// mobilmenyn och footern (samma komponent, olika `size`), så alla tre ser likadana ut.
import { cn } from "@/components/ui/cn";
import { LogoMark } from "@/components/ui/logo-mark";
import { brand, market } from "@/config/brand";

export type BrandLogoSize = "sm" | "lg";

const TEXT_SIZE: Record<BrandLogoSize, string> = {
  sm: "text-19",
  lg: "text-32 sm:text-44",
};

const ICON_SIZE: Record<BrandLogoSize, 40 | 56> = {
  sm: 40,
  lg: 56,
};

const PILL_RADIUS: Record<BrandLogoSize, string> = {
  sm: "rounded-event",
  lg: "rounded-tile",
};

const PILL_PADDING: Record<BrandLogoSize, string> = {
  sm: "px-2",
  lg: "px-4",
};

/** Pupillens mått är proportionella mot textstorleken (D-021-mönstret: geometri räknad ur
 * data, här ur `size`, i stället för en godtycklig Tailwind-klass — D-015 tillåter inga
 * `[…]`-värden). Kvoterna är avlästa ur `logo-bb.html` (fontstorlek 52 → punkt 8×8,
 * position left 9/top 25). Räknas ut direkt i `style`-uttrycket (inte via en variabel):
 * ESLint (D-021) kräver att `style` i src/components/ är ett objekt-literal skrivet direkt
 * i JSX:en, inte en variabel som pekar på ett. */
function pupilDiameter(fontSizePx: number): number {
  return fontSizePx * 0.15;
}

const FONT_PX: Record<BrandLogoSize, number> = {
  sm: 19,
  lg: 44,
};

/** Ordmärket för SE (`brand.name`, två ord): hittar första "oo" i första ordet och lägger
 * pupillen där. Om ordet saknar "oo" (framtida namnbyte) visas det bara som vanlig text,
 * utan att hitta på en pupill någonstans — inget påhittat innehåll. */
function EyeWordmark({ size }: { size: BrandLogoSize }) {
  const words = brand.name.split(" ");
  const first = words[0] ?? brand.name;
  const rest = words.slice(1).join(" ");
  const ooIndex = first.toLowerCase().indexOf("oo");
  const prefix = ooIndex === -1 ? first : first.slice(0, ooIndex);
  const oo = ooIndex === -1 ? "" : first.slice(ooIndex, ooIndex + 2);
  const suffix = ooIndex === -1 ? "" : first.slice(ooIndex + 2);
  const fontPx = FONT_PX[size];
  const diameter = pupilDiameter(fontPx);

  return (
    <span
      className={cn(
        "font-display font-bold tracking-display text-ink on-dark:text-on-dark",
        TEXT_SIZE[size],
      )}
    >
      <span>
        {prefix}
        {oo ? (
          <span className="relative inline-block">
            {oo}
            {/* Pupillen sitter i bokstavens "hål" (räknehålet i o:et), som alltid visar
                bakgrunden bakom texten — den måste alltså kontrastera mot bakgrunden, inte
                mot textfärgen: `bg-ink` på ljus yta, `on-dark:bg-lime` på footerns mörka
                kort. */}
            <span
              aria-hidden="true"
              style={{
                width: `${diameter}px`,
                height: `${diameter}px`,
                left: `${fontPx * 0.17}px`,
                top: `${fontPx * 0.48}px`,
              }}
              className="absolute rounded-full bg-ink on-dark:bg-lime"
            />
          </span>
        ) : null}
        {suffix}
      </span>
      {rest ? (
        <>
          {/* Mellanslag som en egen textnod (inte bara marginal): annars läser
              skärmläsare namnet som "BookingBuddy" utan mellanrum. */}{" "}
          <span
            className={cn("bg-lime", PILL_RADIUS[size], PILL_PADDING[size])}
          >
            {rest}
          </span>
        </>
      ) : null}
    </span>
  );
}

export type BrandLogoProps = {
  /** `sm`: headern och mobilmenyn. `lg`: den stora centrerade varumärkestexten i footern. */
  size?: BrandLogoSize;
  /** Sätts när en omgivande länk/rubrik redan har det tillgängliga namnet. */
  decorative?: boolean;
  className?: string;
};

export function BrandLogo({
  size = "sm",
  decorative = false,
  className,
}: BrandLogoProps) {
  if (market === "SE") {
    // Ordmärkets textnoder bär redan namnet ("Booking" + "Buddy") — ingen egen
    // role="img"/aria-label behövs, till skillnad från CL:s ikonglyf nedan.
    return (
      <span className={cn("inline-flex items-center", className)}>
        <EyeWordmark size={size} />
      </span>
    );
  }

  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <LogoMark
        label={brand.name}
        size={ICON_SIZE[size]}
        decorative={decorative}
      />
      <span
        className={cn(
          "font-display font-bold tracking-display text-ink on-dark:text-on-dark",
          TEXT_SIZE[size],
        )}
      >
        {brand.name}
      </span>
    </span>
  );
}
