// Företagskort i /admin (WP-91), i stil med ägarens referens (CRM-kort): rund
// logga/initialer, pil till detaljsidan, namn, bransch · ort, ägarens e-post,
// plan/status som chips och tre prickar för hur redo företaget är för Descubre
// (bild, adress, tjänster). Hela kortet är en länk. Chile (WP-84, D-069): ingen
// "synlig"-prick — kolumnerna för synlighet i katalogen finns inte här.
import { ArrowUpRight } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

import { CATEGORY_UI } from "@/components/marketplace/categories";
import { cn } from "@/components/ui/cn";
import { categoryForRubro } from "@/config/marketplace";
import { adminPanel, negocio, planes } from "@/i18n";
import { isOwnImageUrl } from "@/lib/media/storage-url";
import type { BusinessListItem } from "@/server/admin/businesses";

const t = adminPanel.lista;

const POINTS = ["imagen", "lugar", "servicios"] as const;

function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter((w) => /^[\p{L}\p{N}]/u.test(w))
    .slice(0, 2)
    .map((w) => w[0]!.toUpperCase())
    .join("");
}

function Chip({
  children,
  tone,
}: {
  children: React.ReactNode;
  tone: "neutral" | "lime" | "alert" | "ink";
}) {
  return (
    <span
      className={cn(
        "rounded-full px-3 py-1 text-12 font-semibold",
        tone === "neutral" && "bg-canvas text-ink",
        tone === "lime" && "bg-lime text-ink",
        tone === "alert" && "bg-alert-bg text-alert-fg",
        tone === "ink" && "bg-ink text-on-dark",
      )}
    >
      {children}
    </span>
  );
}

export function AdminBusinessCard({
  business: b,
}: {
  business: BusinessListItem;
}) {
  const category = categoryForRubro(b.category);
  const ui = CATEGORY_UI[category];
  const rubro =
    (negocio.rubros as Record<string, string | undefined>)[b.category] ??
    negocio.rubros.otro;
  const place = b.comuna.trim() || null;
  const missing = POINTS.filter((p) => !b.readiness[p]).length;
  const image = b.imageUrl && isOwnImageUrl(b.imageUrl) ? b.imageUrl : null;

  return (
    <Link
      href={`/admin/negocios/${b.id}`}
      aria-label={t.abrir({ nombre: b.name })}
      className="group flex h-full flex-col gap-4 rounded-card bg-surface p-5 transition-transform duration-150 ease-out hover:-translate-y-0.5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
    >
      <div className="flex items-start justify-between gap-3">
        <span
          aria-hidden="true"
          className={cn(
            "relative flex size-14 shrink-0 items-center justify-center overflow-hidden rounded-full font-display text-18 font-semibold text-ink",
            image ? "bg-canvas" : ui.tone,
          )}
        >
          {image ? (
            <Image
              src={image}
              alt=""
              fill
              sizes="56px"
              className="object-cover"
              unoptimized={image.endsWith(".svg")}
            />
          ) : (
            initials(b.name) || <ui.icon className="size-6" strokeWidth={2} />
          )}
        </span>
        <span
          aria-hidden="true"
          className="flex size-10 items-center justify-center rounded-full border border-border text-ink transition-colors duration-150 ease-out group-hover:bg-ink group-hover:text-lime"
        >
          <ArrowUpRight className="size-4.5" strokeWidth={2} />
        </span>
      </div>

      <div className="flex min-w-0 flex-col gap-0.5">
        <h2 className="truncate text-18 font-bold text-ink">{b.name}</h2>
        <p className="truncate text-13 text-muted">
          {[rubro, place].filter(Boolean).join(" · ")}
        </p>
        <p className="truncate text-13 text-ink-soft">
          {b.ownerEmail ?? t.sinDueno}
        </p>
      </div>

      <div className="mt-auto flex items-end justify-between gap-3 border-t border-border pt-4">
        <div className="flex flex-col gap-1.5">
          <span className="text-12 text-muted">{t.plan}</span>
          <span className="flex flex-wrap gap-1.5">
            <Chip tone="neutral">{planes.nombres[b.plan]}</Chip>
            {b.billingMode === "manual" ? (
              <Chip tone="ink">{adminPanel.facturacion.etiqueta}</Chip>
            ) : null}
            {b.status === "frozen" ? (
              <Chip tone="alert">{t.congelado}</Chip>
            ) : null}
            {b.deletionRequestedAt ? (
              <Chip tone="alert">{t.borrar}</Chip>
            ) : null}
          </span>
        </div>
        <div className="flex flex-col items-end gap-1.5">
          <span className="text-12 text-muted">
            {missing === 0 ? t.listo : t.faltan({ n: missing })}
          </span>
          <span
            className="flex gap-1"
            aria-label={`${t.descubre}: ${POINTS.map(
              (p) =>
                `${t.puntos[p]} ${b.readiness[p] ? t.puntoOk : t.puntoFalta}`,
            ).join(", ")}`}
            role="img"
          >
            {POINTS.map((p) => (
              <span
                key={p}
                title={t.puntos[p]}
                className={cn(
                  "size-3.5 rounded-full",
                  b.readiness[p] ? "bg-lime ring-1 ring-ink/15" : "bg-border",
                )}
              />
            ))}
          </span>
        </div>
      </div>
    </Link>
  );
}
