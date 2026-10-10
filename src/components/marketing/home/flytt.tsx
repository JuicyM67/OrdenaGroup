// Sektion 1 efter heron: "Smärtfri flytt" (WP-71, Flytt.dc.html). Servern bygger
// förhandsvisningens bilder (marknadens demoföretag) och skickar texten som props till
// den interaktiva klientdelen. Ersätter `migracion-section.tsx` på startsidan.
import { anchor } from "@/config/url-params";
import { brand } from "@/config/brand";
import { copy } from "@/i18n/marketing";

import { DemoCover, DemoLogo, DemoStaff } from "./demo-assets";
import { FlyttDemo } from "./flytt-demo";

const t = copy.home.flytt;
const d = copy.home.demo;

export function FlyttSection() {
  return (
    <div id={anchor("migracion-facil")} className="scroll-mt-24">
      <FlyttDemo
        etiqueta={t.etiqueta}
        tituloPre={t.tituloPre}
        tituloMarca={t.tituloMarca}
        texto={t.texto}
        pasos={t.pasos}
        cta={t.cta}
        nota={t.nota}
        ventana={t.ventana({ nombre: brand.name })}
        pasoDe={[1, 2, 3, 4].map((n) => t.pasoDe({ n }))}
        linkLabel={t.linkLabel}
        urlEjemplo={t.urlEjemplo}
        hamta={t.hamta}
        pegado={t.pegado}
        compat={t.compat}
        leyendo={t.leyendo}
        hallazgos={t.hallazgos}
        elegir={t.elegir}
        opciones={t.opciones}
        importar={t.importar}
        listo={t.listo}
        preview={{
          cover: <DemoCover sizes="470px" loading="eager" />,
          logo: <DemoLogo />,
          staffA: (
            <DemoStaff
              n={1}
              size={30}
              className="size-7.5 rounded-full border-2 border-surface"
            />
          ),
          staffB: (
            <DemoStaff
              n={2}
              size={30}
              className="size-7.5 rounded-full border-2 border-surface"
            />
          ),
          nombre: d.nombre,
          rubro: d.rubro,
          rating: `${d.nota} · ${d.resenas} ${t.omdomen}`,
          servicios: d.servicios,
          flash: d.flash.replace(" · ", " "),
          boka: d.reservar,
          staffMas: d.equipoMas,
        }}
      />
    </div>
  );
}
