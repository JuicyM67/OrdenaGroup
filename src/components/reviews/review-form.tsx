"use client";

// ReviewForm — WP-65 (D-045): kundens recension på `/resena/[token]`.
// Stjärnorna är en riktig radiogrupp (fem `<input type="radio">` i ett
// `<fieldset>`), så tangentbord och skärmläsare fungerar utan egen logik.
// `onSubmit` är en server action bunden till token:en i sidans closure
// (samma mönster som `/baja/[token]`) — aldrig ett klientstyrt token-argument.
import { Star } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { cn } from "@/components/ui/cn";
import { Textarea } from "@/components/ui/textarea";
import { resenas } from "@/i18n";

/** Samma form som `SubmitReviewResult` (`@/server/reviews/public`), utan
 * import från `@/server/*` (gränstest för "use client"-filer). */
type SubmitOutcome = { ok: true } | { ok: false; code: string };

const MAX = 1000;
const t = resenas.formulario;

export function ReviewForm({
  negocio,
  pageHref,
  displayName,
  initial,
  onSubmit,
}: {
  negocio: string;
  pageHref: string;
  displayName: string | null;
  initial: { rating: number; comment: string } | null;
  onSubmit: (input: {
    rating: number;
    comment: string;
  }) => Promise<SubmitOutcome>;
}) {
  const [rating, setRating] = useState(initial?.rating ?? 0);
  const [comment, setComment] = useState(initial?.comment ?? "");
  const [estado, setEstado] = useState<"idle" | "enviando" | "listo" | "error">(
    initial ? "listo" : "idle",
  );
  const [missingRating, setMissingRating] = useState(false);
  const [saved, setSaved] = useState(initial !== null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (rating < 1) {
      setMissingRating(true);
      return;
    }
    setEstado("enviando");
    try {
      const result = await onSubmit({ rating, comment });
      if (result.ok) setSaved(true);
      setEstado(result.ok ? "listo" : "error");
    } catch {
      setEstado("error");
    }
  }

  if (estado === "listo") {
    return (
      <div className="flex flex-col gap-4">
        <div role="status" className="flex flex-col gap-1">
          <p className="text-17 font-bold text-ink">{t.gracias}</p>
          <p className="text-15 text-ink-soft">{t.graciasTexto({ negocio })}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="secondary"
            size="lg"
            onClick={() => setEstado("idle")}
          >
            {t.editar}
          </Button>
          <Button asChild variant="primary" size="lg">
            <a href={pageHref}>{t.verPagina}</a>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <form
      onSubmit={(e) => void handleSubmit(e)}
      className="flex flex-col gap-5"
    >
      <fieldset
        className="flex flex-col gap-2"
        aria-describedby={missingRating ? "rating-error" : undefined}
      >
        <legend className="mb-2 text-13 font-semibold text-ink">
          {t.notaLabel}
        </legend>
        <div className="flex gap-1">
          {[1, 2, 3, 4, 5].map((n) => (
            <label
              key={n}
              className="flex size-12 cursor-pointer items-center justify-center rounded-control transition-colors duration-150 ease-out has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-ink"
            >
              <input
                type="radio"
                name="rating"
                value={n}
                checked={rating === n}
                onChange={() => {
                  setRating(n);
                  setMissingRating(false);
                }}
                className="sr-only"
              />
              <span className="sr-only">{t.estrella({ n })}</span>
              <Star
                aria-hidden="true"
                strokeWidth={1.8}
                className={cn(
                  "size-9",
                  n <= rating ? "fill-ink text-ink" : "fill-none text-subtle",
                )}
              />
            </label>
          ))}
        </div>
        {missingRating ? (
          <p id="rating-error" role="alert" className="text-13 text-alert-fg">
            {t.notaRequerida}
          </p>
        ) : null}
      </fieldset>

      <Textarea
        label={t.comentarioLabel}
        placeholder={t.comentarioPlaceholder}
        value={comment}
        maxLength={MAX}
        rows={5}
        onChange={(e) => setComment(e.target.value)}
        hint={t.contador({ n: comment.length, max: MAX })}
      />

      {displayName ? (
        <p className="text-13 text-muted">
          {t.publicaComo({ nombre: displayName })}
        </p>
      ) : null}

      {estado === "error" ? (
        <p role="alert" className="text-13 text-alert-fg">
          {t.error}
        </p>
      ) : null}

      <Button type="submit" size="xl" disabled={estado === "enviando"}>
        {estado === "enviando" ? t.enviando : saved ? t.guardar : t.enviar}
      </Button>
    </form>
  );
}
