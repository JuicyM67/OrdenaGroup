// WP-67 (D-054): hjärtat på `/[slug]` för en inloggad kund med kundkonto. Ett
// vanligt formulär mot en server action (ingen klient-JS, D-039).
import { Heart } from "lucide-react";

import { cuenta } from "@/i18n";

export function FavoriteHeart({
  businessId,
  saved,
  back,
  action,
}: {
  businessId: string;
  saved: boolean;
  /** Sidan att komma tillbaka till (`/<slug>`). */
  back: string;
  action: (formData: FormData) => Promise<void>;
}) {
  const label = saved ? cuenta.favoritos.guardado : cuenta.favoritos.guardar;
  return (
    <form action={action} className="inline-flex">
      <input type="hidden" name="businessId" value={businessId} />
      <input type="hidden" name="on" value={saved ? "0" : "1"} />
      <input type="hidden" name="back" value={back} />
      <button
        type="submit"
        aria-label={label}
        aria-pressed={saved}
        title={label}
        className="flex size-9 items-center justify-center rounded-full bg-surface text-ink transition-opacity duration-150 ease-out hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
      >
        <Heart
          className={`size-4.5 ${saved ? "fill-current" : ""}`}
          strokeWidth={2.25}
          aria-hidden="true"
        />
      </button>
    </form>
  );
}
