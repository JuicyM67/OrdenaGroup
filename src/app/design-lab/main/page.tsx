// Se docs/tasks/plans/WP-11.md §4 steg 7. Artboard i referensens fulla storlek (1440×900),
// utan extra marginal (annars påverkas npm run visual). `?estado=vacio|lleno` väljer
// fixturtillstånd; standard är referensens läge ("referencia"). `sin-flash` byggs inte än
// (FRÅGA 4 i planen, väntar på `inicio.flashCard.vacio`, WP-03b).
import { InicioScreen } from "@/components/dashboard/inicio-screen";

import { getInicioFixtures, type InicioEstado } from "./fixtures";

function parseEstado(value: string | string[] | undefined): InicioEstado {
  const s = Array.isArray(value) ? value[0] : value;
  return s === "vacio" || s === "lleno" ? s : "referencia";
}

export default async function InicioDesignLabPage({
  searchParams,
}: {
  searchParams: Promise<{ estado?: string | string[] }>;
}) {
  const { estado } = await searchParams;
  const data = getInicioFixtures(parseEstado(estado));

  return (
    <div className="relative h-225 w-360 overflow-hidden">
      <InicioScreen data={data} shellClassName="h-225" />
    </div>
  );
}
