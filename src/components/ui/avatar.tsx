// Hjälpkomponent till PageHeader (UserPill) och AgendaRow (WP-12). Visar initialer på en
// tonad yta. Se DESIGN.md §7 "PageHeader"/"AgendaRow".
// WP-41: tone="peach" tillagd (Profil, Personal-korten) — redan en token (`--color-peach`),
// bara en ny variant i den här cva:n, ingen ny färg.
// WP-44: frivilligt `photoUrl` — samma mönster som `ProfileLogo` i profile-header.tsx
// (`<img>` normal, inte next/image, `object-cover` över hela ytan). Saknas `photoUrl`
// visas initialerna, precis som innan WP-44.
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "./cn";

const avatar = cva(
  "inline-flex shrink-0 items-center justify-center font-bold text-ink",
  {
    variants: {
      shape: {
        circle: "rounded-full",
        square: "rounded-avatar",
      },
      size: {
        36: "size-9 text-13",
        40: "size-10 text-13",
        46: "size-11.5 text-14",
        56: "size-14 text-16",
      },
      tone: {
        lilac: "bg-lilac",
        "lilac-100": "bg-lilac-100",
        peach: "bg-peach",
        "peach-50": "bg-peach-50",
        "lime-50": "bg-lime-50",
        sky: "bg-sky",
        "staff-1": "bg-staff-1",
        "staff-2": "bg-staff-2",
        "staff-3": "bg-staff-3",
        "staff-4": "bg-staff-4",
        "staff-5": "bg-staff-5",
        "staff-6": "bg-staff-6",
      },
    },
    defaultVariants: {
      shape: "circle",
      size: 36,
      tone: "lilac",
    },
  },
);

export type AvatarProps = VariantProps<typeof avatar> & {
  /** Initialer, t.ex. "CR". Läses upp av skärmläsare om `aria-hidden` inte sätts av föräldern. */
  initials: string;
  /** WP-44: foto om det finns (redan filtrerat till vår bucket, se `mediaPathFromUrl`).
   * `null`/saknas = visa initialerna. */
  photoUrl?: string | null;
  /** Alt-text för fotot, t.ex. personens namn. Ignoreras om `photoUrl` saknas. */
  alt?: string;
  className?: string;
};

export function Avatar({
  initials,
  shape,
  size,
  tone,
  photoUrl,
  alt,
  className,
}: AvatarProps) {
  return (
    <span
      className={cn(
        "relative overflow-hidden",
        avatar({ shape, size, tone }),
        className,
      )}
    >
      {photoUrl ? (
        // eslint-disable-next-line @next/next/no-img-element -- samma skäl som ProfileLogo (profile-header.tsx): JS-budgeten.
        <img
          src={photoUrl}
          alt={alt ?? ""}
          loading="lazy"
          className="absolute inset-0 size-full object-cover"
        />
      ) : (
        initials
      )}
    </span>
  );
}
