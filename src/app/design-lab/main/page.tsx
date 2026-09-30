// Se docs/tasks/plans/WP-11.md §4 steg 7. Artboard i referensens fulla storlek (1440×900),
// utan extra marginal (annars påverkas npm run visual). `?estado=vacio|lleno|sin-flash`
// väljer fixturtillstånd; standard är referensens läge ("referencia").
import { InicioScreen } from "@/components/dashboard/inicio-screen";

import { getInicioFixtures, type InicioEstado } from "./fixtures";

const ESTADOS: readonly InicioEstado[] = [
  "vacio",
  "lleno",
  "sin-flash",
  "solicitudes",
];

// WP-45 (D-033): demo för `?estado=solicitudes` (skärmdump till Ägarens svar #5) — ingen
// server bakom design lab, "Confirmar"/"Rechazar" svarar alltid ok utan att ändra fixturen.
// `"use server"` krävs (inte bara en vanlig async-funktion): sidan är en server-komponent,
// och `InicioScreen` (klient) tar bara emot riktiga server actions som props.
async function demoOk() {
  "use server";
  return { ok: true };
}

function parseEstado(value: string | string[] | undefined): InicioEstado {
  const s = Array.isArray(value) ? value[0] : value;
  return (ESTADOS as readonly string[]).includes(s ?? "")
    ? (s as InicioEstado)
    : "referencia";
}

export default async function InicioDesignLabPage({
  searchParams,
}: {
  searchParams: Promise<{ estado?: string | string[] }>;
}) {
  const { estado: rawEstado } = await searchParams;
  const estado = parseEstado(rawEstado);
  const data = getInicioFixtures(estado);
  const showRequests = estado === "solicitudes";

  return (
    <div className="relative h-225 w-360 overflow-hidden">
      <InicioScreen
        data={data}
        shellClassName="h-225"
        onConfirmRequest={showRequests ? demoOk : undefined}
        onDeclineRequest={showRequests ? demoOk : undefined}
      />
    </div>
  );
}
