"use client";

// Kartan i Upptäck (WP-68, Karta.dc.html, D-056): MapLibre GL + OpenFreeMap-tiles
// (gratis, ingen nyckel). Biblioteket laddas med dynamisk import först när
// kartrutten monteras — det följer aldrig med listan eller `/[slug]`. Markörerna är
// rabatt-/blixttidspiller; ett klick markerar kortet i listan bredvid/under.
import { useEffect, useRef, useState } from "react";

export type MapPoint = {
  id: string;
  lat: number;
  lng: number;
  /** "−31 %" eller "16:30". */
  label: string;
  flash: boolean;
  title: string;
};

const STYLE_URL = "https://tiles.openfreemap.org/styles/positron";

/** MapLibres webworker, självhostad (bundlern kan inte följa bibliotekets
 * `import.meta.url`-uppslag). Versionen ska följa `maplibre-gl` i package.json —
 * kopiera `dist/maplibre-gl-{worker,shared}.mjs` vid uppgradering. */
const WORKER_URL = "/vendor/maplibre-gl-6.11.2/maplibre-gl-worker.mjs";

const PIN =
  "rounded-full px-3 py-1.5 text-13 font-bold shadow-soft cursor-pointer transition-transform duration-150 hover:scale-105 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink";
const PIN_DEFAULT = "bg-surface text-ink";
const PIN_FLASH = "bg-lime text-ink";
const PIN_ACTIVE = "bg-ink text-lime";
const ME =
  "size-5 rounded-full border-4 border-surface bg-violet shadow-popover outline-8 outline-violet/25";

function pinClass(p: MapPoint, active: boolean): string {
  return `${PIN} ${active ? PIN_ACTIVE : p.flash ? PIN_FLASH : PIN_DEFAULT}`;
}

export function MapView({
  points,
  center,
  me,
  labels,
}: {
  points: readonly MapPoint[];
  center: { lat: number; lng: number };
  me: { lat: number; lng: number } | null;
  labels: { cargando: string; error: string; tuPosicion: string };
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");

  useEffect(() => {
    let cancelled = false;
    let cleanup: (() => void) | undefined;
    (async () => {
      try {
        const [maplibregl] = await Promise.all([
          import("maplibre-gl"),
          import("maplibre-gl/dist/maplibre-gl.css"),
        ]);
        if (cancelled || !ref.current) return;
        maplibregl.setWorkerUrl(WORKER_URL);
        const map = new maplibregl.Map({
          container: ref.current,
          style: STYLE_URL,
          center: [center.lng, center.lat],
          zoom: 13,
          attributionControl: { compact: true },
          cooperativeGestures: false,
        });
        map.addControl(
          new maplibregl.NavigationControl({ showCompass: false }),
          "bottom-right",
        );
        const els = new Map<string, HTMLButtonElement>();
        const select = (id: string) => {
          for (const [pid, el] of els) {
            const p = points.find((x) => x.id === pid)!;
            el.className = pinClass(p, pid === id);
          }
          const card = document.getElementById(`karta-${id}`);
          card?.scrollIntoView({ behavior: "smooth", block: "nearest" });
          card?.focus({ preventScroll: true });
        };
        for (const p of points) {
          const el = document.createElement("button");
          el.type = "button";
          el.className = pinClass(p, false);
          el.textContent = p.label;
          el.setAttribute("aria-label", `${p.title}, ${p.label}`);
          el.addEventListener("click", () => select(p.id));
          els.set(p.id, el);
          new maplibregl.Marker({ element: el })
            .setLngLat([p.lng, p.lat])
            .addTo(map);
        }
        if (me) {
          const el = document.createElement("div");
          el.className = ME;
          el.setAttribute("role", "img");
          el.setAttribute("aria-label", labels.tuPosicion);
          new maplibregl.Marker({ element: el })
            .setLngLat([me.lng, me.lat])
            .addTo(map);
        }
        if (points.length > 1) {
          const b = new maplibregl.LngLatBounds();
          for (const p of points) b.extend([p.lng, p.lat]);
          if (me) b.extend([me.lng, me.lat]);
          map.fitBounds(b, {
            padding: { top: 150, bottom: 50, left: 50, right: 50 },
            maxZoom: 15,
            duration: 0,
          });
        }
        map.on("load", () => setState("ready"));
        map.on("error", () => {
          if (!map.loaded()) setState("error");
        });
        cleanup = () => map.remove();
      } catch {
        if (!cancelled) setState("error");
      }
    })();
    return () => {
      cancelled = true;
      cleanup?.();
    };
  }, [points, center, me, labels.tuPosicion]);

  return (
    <div className="absolute inset-0 bg-sky">
      <div ref={ref} className="size-full" />
      {state === "ready" ? null : (
        <p
          role="status"
          className="absolute inset-x-0 top-1/2 text-center text-14 font-semibold text-ink-soft"
        >
          {state === "error" ? labels.error : labels.cargando}
        </p>
      )}
    </div>
  );
}
