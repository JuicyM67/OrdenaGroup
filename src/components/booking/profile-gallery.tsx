// ProfileGallery — WP-81 (ägarens referens 2026-10-30): mosaik överst på
// bokningssidan — en stor bild och två mindre (dator: stor till vänster, två
// staplade till höger) — och "Fler bilder" som öppnar alla bilder i
// helskärm. Döljs helt utan bilder.
//
// Helskärmsvyn är ett `popover`-element (webbläsarens inbyggda Popover API):
// knapparna öppnar och stänger den utan någon JS i bokningssidans bunt
// (JS-budgeten, D-032/D-039), och Esc stänger. `id` måste vara unikt per
// sida — komponenten renderas både i dator- och mobilvyn.
//
// `<img>` normal, INTE `next/image`: `next/image`s klientmodul räknas in i
// sidans JS oavsett om en bild renderas (e2e/reserva.spec.ts "prestanda").
// Bilderna kommer från Supabase Storages publika bucket och är redan
// optimerade vid uppladdning (`IMAGE_MAX_BYTES` = 2 MiB).
import { Images, X } from "lucide-react";

import { cn } from "@/components/ui/cn";
import { perfil } from "@/i18n";

const t = perfil.publico.galeria;

export function ProfileGallery({
  id,
  images,
  negocio,
  className,
}: {
  id: string;
  images: readonly string[];
  negocio: string;
  className?: string;
}) {
  if (images.length === 0) return null;
  const visible = images.slice(0, 3);
  const viewerId = `${id}-alla`;

  return (
    <div className={className}>
      <div
        className={cn(
          "grid gap-2 overflow-hidden rounded-card",
          visible.length === 1
            ? "grid-cols-1"
            : visible.length === 2
              ? "grid-cols-2"
              : "grid-cols-2 lg:h-90 lg:grid-cols-3 lg:grid-rows-2",
        )}
      >
        {visible.map((url, i) => {
          const big = visible.length === 3 && i === 0;
          const last = i === visible.length - 1;
          return (
            <button
              key={url}
              type="button"
              popoverTarget={viewerId}
              aria-label={t.abrir({ negocio, n: images.length })}
              className={cn(
                "group relative overflow-hidden bg-lavender focus-visible:outline-2 focus-visible:-outline-offset-4 focus-visible:outline-ink",
                visible.length === 1 && "aspect-16/9",
                visible.length === 2 && "aspect-4/3",
                visible.length === 3 &&
                  (big
                    ? "col-span-2 aspect-16/10 lg:col-span-2 lg:row-span-2 lg:aspect-auto"
                    : "aspect-16/10 lg:aspect-auto"),
              )}
            >
              {/* eslint-disable-next-line @next/next/no-img-element -- se filkommentaren (JS-budgeten). */}
              <img
                src={url}
                alt={t.foto({ negocio, n: i + 1 })}
                loading={i === 0 ? "eager" : "lazy"}
                className="absolute inset-0 size-full object-cover transition-transform duration-300 ease-out group-hover:scale-102"
              />
              {last && images.length > 1 ? (
                <span className="absolute right-2.5 bottom-2.5 flex items-center gap-1.5 rounded-control bg-surface/90 px-3 py-2 text-13 font-semibold text-ink">
                  {t.mas}
                  <Images
                    aria-hidden="true"
                    className="size-4"
                    strokeWidth={2}
                  />
                </span>
              ) : null}
            </button>
          );
        })}
      </div>

      <div
        id={viewerId}
        popover="auto"
        aria-label={t.titulo({ negocio })}
        className="fixed inset-0 m-0 size-full max-h-none max-w-none overflow-y-auto overscroll-contain border-0 bg-dark p-0 text-on-dark"
      >
        <div className="sticky top-0 z-10 flex items-center justify-between gap-3 bg-dark px-4 py-3 lg:px-8">
          <p className="text-15 font-semibold">
            {t.titulo({ negocio })}
            <span className="ml-2 text-13 font-normal text-on-dark/70">
              {t.cantidad({ n: images.length })}
            </span>
          </p>
          <button
            type="button"
            popoverTarget={viewerId}
            popoverTargetAction="hide"
            aria-label={t.cerrar}
            className="flex size-11 items-center justify-center rounded-full bg-on-dark/10 hover:bg-on-dark/20 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-lime"
          >
            <X aria-hidden="true" className="size-5" strokeWidth={2} />
          </button>
        </div>
        <ul className="mx-auto flex max-w-240 flex-col gap-3 px-4 pt-2 pb-10 lg:px-8">
          {images.map((url, i) => (
            <li key={url}>
              {/* eslint-disable-next-line @next/next/no-img-element -- se filkommentaren (JS-budgeten). */}
              <img
                src={url}
                alt={t.foto({ negocio, n: i + 1 })}
                loading="lazy"
                className="w-full rounded-icon bg-on-dark/5 object-contain"
              />
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
