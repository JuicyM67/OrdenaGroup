"use client";

// WP-87 (D-073, som SE D-058): "Imprimir o guardar como PDF" — webbläsarens
// utskrift (inget PDF-bibliotek). Enda klient-JS:n på kortsidan.
import { Printer } from "lucide-react";

export function PrintButton({ label }: { label: string }) {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="flex min-h-12 items-center justify-center gap-2 rounded-full bg-ink px-5.5 text-15 font-bold text-on-dark focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink print:hidden"
    >
      <Printer aria-hidden="true" className="size-4.5" strokeWidth={2} />
      {label}
    </button>
  );
}
