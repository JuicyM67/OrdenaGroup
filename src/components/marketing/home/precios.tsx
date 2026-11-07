// Sektion 7: Priser (WP-71, SidaP3.dc.html). Planer och planpunkter kommer från
// `copy.PLANES` (samma som /precios), priserna från `src/config/pricing.ts`. Avgiftsrutan
// använder `copy.home.precios.nota` (en enda i18n-nyckel per marknad).
import { PlanCards, PlanCustomBand } from "@/components/marketing/plan-cards";
import { copy } from "@/i18n/marketing";

import { HomeHeading } from "./home-heading";
import { SIGNUP_PATH } from "@/config/routes";

const t = copy.home.precios;

export function Precios() {
  return (
    <section id="precios" className="scroll-mt-24 bg-surface">
      <div className="mx-auto flex max-w-360 flex-col gap-9 px-4 py-16 sm:px-8 lg:px-22 lg:py-30">
        <div className="flex flex-col items-center gap-4 text-center">
          <HomeHeading
            etiqueta={t.etiqueta}
            pre={t.tituloPre}
            marca={t.tituloMarca}
            className="items-center"
          />
          <p className="max-w-2xl text-15 text-muted sm:text-17">
            {copy.landing.precios.subtitulo}
          </p>
        </div>
        <div>
          <PlanCards ctaHref={SIGNUP_PATH} variant="foto" />
          <PlanCustomBand />
        </div>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="flex items-center gap-4 rounded-tile border border-line-strong bg-surface px-6 py-5">
            <b className="shrink-0 font-display text-30 whitespace-nowrap">
              {t.nota.valor}
            </b>
            <span className="text-14 leading-body text-muted">
              {t.nota.texto}
            </span>
          </div>
          <div className="flex items-center gap-4 rounded-tile bg-lime px-6 py-5 text-ink">
            <b className="shrink-0 font-display text-30">{t.fundador.valor}</b>
            <span className="text-14 leading-body">
              <b>{t.fundador.negrita}</b> {t.fundador.texto}
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}
