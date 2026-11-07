"use client";

// WP-87 (D-073): raden "Regala una tarjeta de regalo · cómprala en el local"
// på bokningssidan (`businesses.gift_cards_enabled`, av som standard).
import { useState } from "react";

import { Switch } from "@/components/ui/switch";
import { comun, regalo } from "@/i18n";

const t = regalo.caja.mostrar;

export function ShowOnPageToggle({
  initial,
  action,
}: {
  initial: boolean;
  action: (enabled: boolean) => Promise<{ ok: boolean }>;
}) {
  const [on, setOn] = useState(initial);
  const [pending, setPending] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between gap-3">
        <span className="text-14 font-semibold text-ink">{t.toggle}</span>
        <Switch
          checked={on}
          label={t.toggle}
          disabled={pending}
          onChange={async (next) => {
            setPending(true);
            setNotice(null);
            const r = await action(next);
            setPending(false);
            if (r.ok) {
              setOn(next);
              setNotice(t.guardado);
            } else {
              setNotice(comun.algoSalioMal);
            }
          }}
        />
      </div>
      <p className="text-13 text-muted">{t.ayuda}</p>
      {notice ? (
        <p role="status" className="text-13 text-ink">
          {notice}
        </p>
      ) : null}
    </div>
  );
}
