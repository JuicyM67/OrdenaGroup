// SMS-krediter (bara SE, WP-75/D-048): paketen som enkla glaskort på Priser, plus punkten
// på "Varför oss". Siffrorna är ägarens: 1 kr/sms exkl. moms, paket 100/250/500/1 000,
// planernas sms per månad (0/50/150/300) läses ur samma tabell som plankorten.
import { formatMonto } from "@/config/pricing";
import { copy } from "@/i18n/marketing";
import { paginas } from "@/i18n/paginas";
import { Highlight } from "@/components/marketing/highlight";

/** Paket i öre. 500 och 1 000 har mängdrabatt. */
const PAQUETES = [
  { n: 100, precio: 10000, ahorro: 0 },
  { n: 250, precio: 25000, ahorro: 0 },
  { n: 500, precio: 45000, ahorro: 5000 },
  { n: 1000, precio: 90000, ahorro: 10000 },
] as const;

/** Sms per månad som ingår i Gratis, Starta, Team, Företag (matrisen i D-048). */
const SMS_POR_PLAN = [0, 50, 150, 300] as const;

export function SmsCreditos() {
  const t = paginas.sms;
  if (!t) return null;
  return (
    <section className="mx-auto max-w-6xl px-4 pb-14 sm:px-8">
      <div className="relative overflow-hidden rounded-shell bg-linear-to-br from-lime-50 to-lavender p-6 sm:p-10">
        <div className="flex flex-col gap-3">
          <span className="w-fit rounded-chip bg-surface px-3 py-1.75 text-13 font-bold tracking-label">
            {t.etiqueta}
          </span>
          <h2 className="font-display text-30 leading-none font-semibold tracking-headline sm:text-44">
            {t.titulo.pre}
            <Highlight>{t.titulo.marca}</Highlight>
          </h2>
          <p className="max-w-2xl text-16 leading-relaxed text-ink-soft">
            {t.texto}
          </p>
        </div>
        <ul className="mt-7 grid grid-cols-2 gap-3.5 lg:grid-cols-4">
          {PAQUETES.map((p) => (
            <li
              key={p.n}
              className="flex flex-col gap-1.5 rounded-hero p-5 glass-light"
            >
              <b className="font-display text-26">
                {t.paquete({ n: p.n, precio: formatMonto(p.precio) })}
              </b>
              <span className="text-20 font-bold">{formatMonto(p.precio)}</span>
              {p.ahorro > 0 ? (
                <span className="w-fit rounded-badge bg-success-bg px-2 py-1 text-12 font-bold text-success-fg">
                  {t.ahorro({ monto: formatMonto(p.ahorro) })}
                </span>
              ) : null}
            </li>
          ))}
        </ul>
        <ul className="mt-5 flex flex-col gap-1 text-14 text-ink-soft sm:flex-row sm:flex-wrap sm:gap-x-6">
          {t.notas.map((n) => (
            <li key={n}>{n}</li>
          ))}
          <li>
            {t.perMes}:{" "}
            {copy.PLANES.slice(0, 4)
              .map((pl, i) => `${pl.nombre} ${SMS_POR_PLAN[i]}`)
              .join(" · ")}
          </li>
        </ul>
      </div>
    </section>
  );
}

/** Kort punkt på "Varför oss". */
export function SmsVentaja() {
  const t = paginas.sms;
  if (!t) return null;
  return (
    <section className="mx-auto max-w-6xl px-4 pb-14 sm:px-8">
      <div className="flex flex-col gap-1.5 rounded-hero p-6 glass-light">
        <b className="font-display text-22">{t.ventaja.titulo}</b>
        <p className="text-15 leading-relaxed text-ink-soft">
          {t.ventaja.texto}
        </p>
      </div>
    </section>
  );
}
