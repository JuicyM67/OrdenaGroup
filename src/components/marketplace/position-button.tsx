"use client";

// "Min position" (WP-68, D-055): den enda klientön på listsidan. Koordinaterna
// avrundas till 2 decimaler (~1 km) i webbläsaren och sparas i sessionscookien
// `nara` (30 min, SameSite=Lax) — aldrig i URL:en (åtkomstloggar), aldrig i DB.
// Servern läser cookien vid nästa rendering (router.refresh()).
import { LocateFixed, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { cn } from "@/components/ui/cn";
import { POSITION_COOKIE, POSITION_MAX_AGE_S } from "@/config/marketplace";
import { hrefMarketplace } from "@/config/routes";

import { formatPositionCookie } from "./params";

type Labels = {
  miPosicion: string;
  quitar: string;
  cargando: string;
  denegada: string;
  nota: string;
};

/** Cookien gäller bara Upptäck (`/upptack`, CL `/descubre`, inkl. kartan) —
 * ingen annan sida får positionen (K3). Erbjudandesidan använder den inte. */
const COOKIE_PATH = hrefMarketplace("descubre");

function writeCookie(value: string, maxAge: number): void {
  const secure = window.location.protocol === "https:" ? "; Secure" : "";
  document.cookie = `${POSITION_COOKIE}=${value}; Max-Age=${maxAge}; Path=${COOKIE_PATH}; SameSite=Lax${secure}`;
  // Äldre version satte Path=/ — städa bort den vid varje skrivning.
  document.cookie = `${POSITION_COOKIE}=; Max-Age=0; Path=/; SameSite=Lax${secure}`;
}

export function PositionButton({
  active,
  labels,
  className,
}: {
  active: boolean;
  labels: Labels;
  className?: string;
}) {
  const router = useRouter();
  const [state, setState] = useState<"idle" | "loading" | "denied">("idle");
  const [pending, startTransition] = useTransition();

  const refresh = () => startTransition(() => router.refresh());

  if (active) {
    return (
      <button
        type="button"
        onClick={() => {
          writeCookie("", 0);
          refresh();
        }}
        className={cn(
          "flex w-full items-center gap-2.5 rounded-event px-3 py-2.5 text-left text-14 font-semibold hover:bg-ink/5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink",
          className,
        )}
      >
        <X aria-hidden="true" className="size-4.5" strokeWidth={2} />
        {labels.quitar}
      </button>
    );
  }

  return (
    <div className={cn("flex flex-col gap-1", className)}>
      <button
        type="button"
        disabled={state === "loading" || pending}
        onClick={() => {
          if (!("geolocation" in navigator)) {
            setState("denied");
            return;
          }
          setState("loading");
          navigator.geolocation.getCurrentPosition(
            (pos) => {
              writeCookie(
                formatPositionCookie({
                  lat: pos.coords.latitude,
                  lng: pos.coords.longitude,
                }),
                POSITION_MAX_AGE_S,
              );
              setState("idle");
              refresh();
            },
            () => setState("denied"),
            { enableHighAccuracy: false, maximumAge: 600_000, timeout: 10_000 },
          );
        }}
        className="flex w-full items-center gap-2.5 rounded-event bg-ink px-3 py-2.5 text-left text-14 font-bold text-on-dark hover:bg-ink-soft focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink disabled:opacity-70"
      >
        <LocateFixed aria-hidden="true" className="size-4.5" strokeWidth={2} />
        {state === "loading" || pending ? labels.cargando : labels.miPosicion}
      </button>
      <p role="status" className="px-1 text-12 text-muted">
        {state === "denied" ? labels.denegada : labels.nota}
      </p>
    </div>
  );
}
