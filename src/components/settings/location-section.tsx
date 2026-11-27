"use client";

// WP-98c (D-083): Ajustes → Tu negocio → "Ubicación en el mapa". MapLibre (samma
// stil och självhostade worker som Descubre-kartan, `map-view.tsx`) med en
// dragbar nål; ett tryck på kartan flyttar också nålen. "Confirmar ubicación"
// sparar positionen som bekräftad (`geocode_status = 'manual'`).
import { AlertCircle, CheckCircle2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ajustes, ubicacionAjustes as t } from "@/i18n";

import { ajustesErrorText } from "./error-text";
import type { MutationResult } from "./types";

const STYLE_URL = "https://tiles.openfreemap.org/styles/positron";
const WORKER_URL = "/vendor/maplibre-gl-6.11.2/maplibre-gl-worker.mjs";
/** Santiago centro — när adressen ännu inte har någon position. */
const FALLBACK = { lat: -33.4489, lng: -70.6693 };

const PIN =
  "size-6 rounded-full border-4 border-surface bg-ink shadow-popover cursor-grab active:cursor-grabbing";

export type LocationSectionData = {
  address: string | null;
  geo: { lat: number; lng: number } | null;
  status: "pending" | "ok" | "not_found" | "manual";
};

export function LocationSection({
  location,
  action,
}: {
  location: LocationSectionData;
  action: (input: { lat: number; lng: number }) => Promise<MutationResult>;
}) {
  const router = useRouter();
  const ref = useRef<HTMLDivElement>(null);
  const [mapState, setMapState] = useState<"loading" | "ready" | "error">(
    "loading",
  );
  const [point, setPoint] = useState(location.geo);
  const [dirty, setDirty] = useState(false);
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">(
    "idle",
  );
  const [submitError, setSubmitError] = useState<string | undefined>();

  const hasAddress = Boolean(location.address);
  const start = location.geo;

  useEffect(() => {
    if (!hasAddress) return;
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
        const center = start ?? FALLBACK;
        const map = new maplibregl.Map({
          container: ref.current,
          style: STYLE_URL,
          center: [center.lng, center.lat],
          zoom: start ? 17 : 11,
          attributionControl: { compact: true },
        });
        map.addControl(
          new maplibregl.NavigationControl({ showCompass: false }),
          "bottom-right",
        );
        const el = document.createElement("div");
        el.className = PIN;
        el.setAttribute("role", "img");
        el.setAttribute("aria-label", t.marcador);
        const marker = new maplibregl.Marker({ element: el, draggable: true });
        const place = (lng: number, lat: number) => {
          setPoint({
            lat: Math.round(lat * 1e5) / 1e5,
            lng: Math.round(lng * 1e5) / 1e5,
          });
          setDirty(true);
          setStatus("idle");
        };
        if (start) marker.setLngLat([start.lng, start.lat]).addTo(map);
        marker.on("dragend", () => {
          const p = marker.getLngLat();
          place(p.lng, p.lat);
        });
        map.on("click", (e) => {
          marker.setLngLat(e.lngLat).addTo(map);
          place(e.lngLat.lng, e.lngLat.lat);
        });
        map.on("load", () => setMapState("ready"));
        map.on("error", () => {
          if (!map.loaded()) setMapState("error");
        });
        cleanup = () => map.remove();
      } catch {
        if (!cancelled) setMapState("error");
      }
    })();
    return () => {
      cancelled = true;
      cleanup?.();
    };
  }, [hasAddress, start]);

  async function save() {
    if (!point) return;
    setStatus("saving");
    setSubmitError(undefined);
    try {
      const result = await action(point);
      if (result.ok) {
        setStatus("saved");
        setDirty(false);
        router.refresh();
      } else {
        setStatus("error");
        setSubmitError(ajustesErrorText(result.code));
      }
    } catch {
      setStatus("error");
      setSubmitError(ajustesErrorText("unknown"));
    }
  }

  const confirmed = location.status === "manual" && !dirty;
  // En automatisk position kan bekräftas som den är, utan att flytta nålen.
  const canSave =
    point !== null && status !== "saving" && (dirty || !confirmed);

  return (
    <Card radius="tile" padding="lg" className="flex flex-col gap-5">
      <div className="flex flex-col gap-1">
        <h2 className="text-18 font-bold text-ink">{t.titulo}</h2>
        <p className="text-14 text-muted">{t.intro}</p>
      </div>

      {!hasAddress ? (
        <p className="text-14 text-ink">{t.sinDireccion}</p>
      ) : (
        <>
          {confirmed ? (
            <p className="flex items-center gap-2 rounded-control bg-success-bg p-3 text-14 font-semibold text-success-fg">
              <CheckCircle2
                aria-hidden="true"
                className="size-4 shrink-0"
                strokeWidth={2}
              />
              {t.estado.manual}
            </p>
          ) : dirty ? null : (
            <p className="flex items-start gap-2 rounded-control bg-pending-bg p-3 text-14 text-ink">
              <AlertCircle
                aria-hidden="true"
                className="mt-0.5 size-4 shrink-0"
                strokeWidth={2}
              />
              {t.estado[location.status]}
            </p>
          )}

          <div className="relative aspect-16/10 w-full overflow-hidden rounded-control bg-sky">
            <div ref={ref} className="size-full" />
            {mapState === "ready" ? null : (
              <p
                role="status"
                className="absolute inset-x-0 top-1/2 text-center text-14 font-semibold text-ink-soft"
              >
                {mapState === "error" ? t.errorMapa : t.cargando}
              </p>
            )}
          </div>
          <p className="text-13 text-muted">{location.address}</p>

          {submitError ? (
            <p role="alert" className="text-13 font-semibold text-ink">
              {submitError}
            </p>
          ) : null}

          <div className="flex items-center gap-3">
            <Button
              type="button"
              size="xl"
              disabled={!canSave}
              onClick={() => void save()}
            >
              {status === "saving" ? ajustes.guardando : t.guardar}
            </Button>
            {status === "saved" ? (
              <span role="status" className="text-13 text-muted">
                {ajustes.cambiosGuardados}
              </span>
            ) : null}
          </div>
        </>
      )}
    </Card>
  );
}
