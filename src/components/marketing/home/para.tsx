// Sektion 6: "För vem" som foto-mosaik med tolv branschbilder och glas-etiketter
// (WP-71, SidaP3.dc.html). Fyra kolumner på desktop (höjderna 300/220 ger lika höga
// kolumner), 2 kolumner på mobil. Bilderna är dekorativa; etiketten är texten.
import Image from "next/image";

import { copy } from "@/i18n/marketing";

import { HomeHeading } from "./home-heading";

const t = copy.home.para;

type Tile = { id: string; tall: boolean };
const COLUMNS: readonly (readonly Tile[])[] = [
  [
    { id: "frisor", tall: true },
    { id: "hudvard", tall: false },
    { id: "tatuering", tall: false },
  ],
  [
    { id: "barberare", tall: false },
    { id: "massage", tall: false },
    { id: "hundtrim", tall: true },
  ],
  [
    { id: "naglar", tall: false },
    { id: "naprapat", tall: true },
    { id: "pt", tall: false },
  ],
  [
    { id: "fransar", tall: true },
    { id: "yoga", tall: false },
    { id: "makeup", tall: false },
  ],
];

export function Para() {
  const labels = new Map(t.rubros.map((r) => [r.id, r.label]));
  return (
    <section id="para-quien" className="scroll-mt-24 bg-canvas">
      <div className="mx-auto flex max-w-360 flex-col gap-10 px-4 py-16 sm:px-8 lg:px-22 lg:py-30">
        <div className="flex flex-col justify-between gap-6 lg:flex-row lg:items-end lg:gap-10">
          <HomeHeading
            etiqueta={t.etiqueta}
            pre={t.tituloPre}
            marca={t.tituloMarca}
          />
          <p className="max-w-100 text-16 leading-relaxed text-muted sm:text-17">
            {t.texto}
          </p>
        </div>
        <div className="grid grid-cols-2 items-start gap-3.5 lg:grid-cols-4">
          {COLUMNS.map((col) => (
            <div key={col[0]!.id} className="flex flex-col gap-3.5">
              {col.map((tile) => (
                <figure
                  key={tile.id}
                  className={
                    tile.tall
                      ? "group relative h-60 overflow-hidden rounded-card lg:h-75"
                      : "group relative h-44 overflow-hidden rounded-card lg:h-55"
                  }
                >
                  <Image
                    src={`/marketing/${tile.id}.webp`}
                    alt=""
                    fill
                    sizes="(min-width: 1024px) 25vw, 50vw"
                    className="object-cover transition-transform duration-500 ease-out group-hover:scale-105"
                  />
                  <figcaption className="absolute bottom-3 left-3 rounded-control px-3 py-2 text-13 font-bold glass-light sm:text-14">
                    {labels.get(tile.id)}
                  </figcaption>
                </figure>
              ))}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
