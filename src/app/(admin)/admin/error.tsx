"use client";

// WP-93: felgräns för /admin/* — i stället för Nexts standardsida ("This page
// couldn't load") visas en läsbar text, felets digest (matchar raden i Vercels
// loggar) och vägar tillbaka. Ingen persondata: bara digest, aldrig meddelandet.
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { adminPanel } from "@/i18n";

const t = adminPanel.errorPagina;

export default function AdminError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main className="flex min-h-dvh items-center justify-center bg-canvas px-4 py-10">
      <div className="flex w-full max-w-md flex-col gap-4 rounded-card bg-surface p-8">
        <h1 className="text-22 font-bold tracking-title text-ink">
          {t.titulo}
        </h1>
        <p className="text-15 text-ink-soft">{t.texto}</p>
        {error.digest ? (
          <p className="text-12 text-muted">
            {t.codigo({ codigo: error.digest })}
          </p>
        ) : null}
        <div className="flex flex-wrap items-center gap-3">
          <Button type="button" size="lg" onClick={() => reset()}>
            {t.reintentar}
          </Button>
          <Link
            href="/admin"
            className="text-14 font-semibold text-ink underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
          >
            {t.volver}
          </Link>
        </div>
      </div>
    </main>
  );
}
