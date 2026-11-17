"use client";

// Utskriftssidan (WP-95, D-079): öppnar webbläsarens utskrift när typsnitten laddats, en
// gång. Knappen finns kvar om webbläsaren blockerade eller användaren stängde dialogen.
import { Printer } from "lucide-react";
import { useEffect, useRef } from "react";

import { Button } from "@/components/ui/button";
import { strokeCard } from "@/components/ui/icons";

export function PrintButton({ label }: { label: string }) {
  const done = useRef(false);

  useEffect(() => {
    if (done.current) return;
    done.current = true;
    void document.fonts.ready.then(() => {
      window.print();
    });
  }, []);

  return (
    <Button
      type="button"
      variant="primary"
      size="md"
      onClick={() => {
        window.print();
      }}
    >
      <Printer aria-hidden="true" className="size-4" strokeWidth={strokeCard} />
      {label}
    </Button>
  );
}
