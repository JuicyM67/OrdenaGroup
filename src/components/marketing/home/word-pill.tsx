"use client";

// Glas-pill "Bokningssystemet för {bransch}" i heron: ordet byts med mjuk övergång och
// pillens bredd följer ordet (WP-71, Konv1.dc.html). Rörelsen stängs av vid
// `prefers-reduced-motion` (första ordet står kvar).
import { useEffect, useState } from "react";

import { cn } from "@/components/ui/cn";

export function WordPill({
  prefijo,
  palabras,
}: {
  prefijo: string;
  palabras: readonly string[];
}) {
  const [i, setI] = useState(0);
  const n = palabras.length;

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const id = setInterval(() => setI((v) => (v + 1) % n), 2600);
    return () => clearInterval(id);
  }, [n]);

  const prev = (i + n - 1) % n;
  const ancho = Math.round((palabras[i] ?? "").length * 7.6 + 2);

  return (
    <span className="flex max-w-full flex-wrap items-center gap-1.5 self-start rounded-panel px-3.5 py-2 text-13 font-semibold glass-nav">
      <span
        aria-hidden="true"
        className="size-2 shrink-0 rounded-full bg-lime"
      />
      {prefijo}
      <span
        style={{ width: `${ancho}px` }}
        className="relative inline-block h-4.5 overflow-hidden transition-all duration-500 ease-out"
      >
        {palabras.map((w, k) => (
          <span
            key={w}
            aria-hidden={k === i ? undefined : true}
            className={cn(
              "absolute top-0 left-0 font-bold whitespace-nowrap text-lime transition-all duration-500 ease-out",
              k === i
                ? "translate-y-0 opacity-100"
                : k === prev
                  ? "-translate-y-full opacity-0"
                  : "translate-y-full opacity-0",
            )}
          >
            {w}
          </span>
        ))}
      </span>
    </span>
  );
}
