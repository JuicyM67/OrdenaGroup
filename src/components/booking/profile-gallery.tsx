// ProfileGallery — mosaico de fotos (`ProfilDesktop.dc.html` rad 47). Máximo 6
// visibles + "+N" (plan WP-41, "Contenido"); la sección entera se oculta si
// no hay fotos (`booking-screen.tsx`, no acá).
//
// `<img>` normal, NO `next/image` (avvikelse mot planens "next/image", qa-fynd
// e2e/reserva.spec.ts "prestanda"): `next/image`s klientmodul räknas in i
// sidans JS oavsett om en bild faktiskt renderas den sidladdningen — seed-
// företaget (`barberia-norte`) saknar bilder, så testet mätte fasta kostnaden
// för `next/image` utan någon bild alls, 187,2 kB mot 180 kB-budgeten
// (D-032). Bilderna kommer från Supabase Storages publika bucket (redan
// optimerade vid uppladdning, `IMAGE_MAX_BYTES` = 2 MiB) — ingen
// serversideoptimering behövs för att hålla dem rimliga.
import { perfil } from "@/i18n";

const VISIBLE = 6;

export function ProfileGallery({
  images,
}: {
  images: readonly string[];
}) {
  if (images.length === 0) return null;
  const visible = images.slice(0, VISIBLE);
  const rest = images.length - visible.length;

  return (
    <div className="grid grid-cols-3 gap-3">
      {visible.map((url, i) => {
        const isLastWithMore = rest > 0 && i === visible.length - 1;
        return (
          <div
            key={url}
            className="relative h-31.5 overflow-hidden rounded-icon bg-lavender lg:h-37.5"
          >
            {/* eslint-disable-next-line @next/next/no-img-element -- se filkommentaren (JS-budgeten). */}
            <img
              src={url}
              alt=""
              loading="lazy"
              className="absolute inset-0 size-full object-cover"
            />
            {isLastWithMore ? (
              <div className="absolute inset-0 flex items-center justify-center bg-ink/55 text-15 font-bold text-on-dark">
                {perfil.publico.nFotos({ n: rest })}
              </div>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}
