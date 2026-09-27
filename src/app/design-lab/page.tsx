import Link from "next/link";

import crops from "./crops/crops.json";

const screens = [
  { href: "/design-lab/main", label: "Inicio (Main)", wp: "WP-11" },
  { href: "/design-lab/agenda", label: "Agenda", wp: "WP-12" },
  { href: "/design-lab/agenda-dia", label: "Agenda · día", wp: "WP-12" },
  { href: "/design-lab/reserva", label: "Reserva", wp: "WP-13" },
  { href: "/design-lab/hoy", label: "Hoy", wp: "WP-14" },
  { href: "/design-lab/hora-flash", label: "Hora flash", wp: "WP-30" },
];

export default function DesignLabIndexPage() {
  return (
    <main className="mx-auto max-w-160 px-6 py-10 text-ink">
      <h1 className="font-display text-32 font-bold tracking-display">
        Design lab
      </h1>
      <p className="mt-2 text-14 text-muted">
        Bara till för utveckling. Stängd i produktion (VERCEL_ENV=production),
        noindex.
      </p>

      <section className="mt-8">
        <h2 className="text-18 font-bold">Katalog</h2>
        <ul className="mt-2 flex flex-col gap-1">
          <li>
            <Link
              className="text-14 font-semibold underline"
              href="/design-lab/components"
            >
              /design-lab/components — alla komponenter, varianter och tillstånd
            </Link>
          </li>
        </ul>
      </section>

      <section className="mt-8">
        <h2 className="text-18 font-bold">
          Utsnitt (npm run visual -- components)
        </h2>
        <ul className="mt-2 flex flex-col gap-1">
          {crops.map((c) => (
            <li key={c.id}>
              <Link
                className="text-14 font-semibold underline"
                href={`/design-lab/crops/${c.id}`}
              >
                {c.id}
              </Link>
              <span className="ml-2 text-13 text-muted">{c.verifies}</span>
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-8">
        <h2 className="text-18 font-bold">Skärmar</h2>
        <ul className="mt-2 flex flex-col gap-1">
          {screens.map((s) => (
            <li key={s.href} className="text-14">
              <Link className="font-semibold underline" href={s.href}>
                {s.label}
              </Link>
              <span className="ml-2 text-13 text-muted">{s.wp}</span>
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}
