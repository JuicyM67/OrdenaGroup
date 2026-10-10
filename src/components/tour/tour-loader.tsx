// Laddar kundens guidade visning som egen lazy chunk, bara när den ska visas (WP-72).
// Medvetet en minimal `import()` i en effekt i stället för `next/dynamic`: dynamic-
// runtimen kostar ~1 kB gzip i alla besökares bunt, och JS-budgeten för /[slug] (D-039,
// e2e/reserva.spec.ts) har bara ett par kB marginal.
"use client";

import { type ComponentType, useEffect, useState } from "react";

interface Props {
  coverUrl: string | null;
  onStepChange?: (id: string | null) => void;
}

export function TourLoader(props: Props) {
  const [Tour, setTour] = useState<ComponentType<Props> | null>(null);
  useEffect(() => {
    let live = true;
    void import("./customer-tour").then((m) => {
      if (live) setTour(() => m.default);
    });
    return () => {
      live = false;
    };
  }, []);
  return Tour ? <Tour {...props} /> : null;
}
