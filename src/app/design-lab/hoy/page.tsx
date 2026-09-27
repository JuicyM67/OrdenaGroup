// Se docs/tasks/plans/WP-14.md §4 steg 5. Artboard i referensens fulla storlek (390×844), så
// att npm run visual hoy kan jämföra pixel för pixel. `?estado=` växlar tillstånd, se
// fixtures.ts.
import type { Metadata } from "next";

import { HoyScreen } from "@/components/mobile/hoy-screen";

import { buildFixture } from "./fixtures";

export const metadata: Metadata = {
  title: "Hoy — design lab",
};

export default async function DesignLabHoyPage({
  searchParams,
}: {
  searchParams: Promise<{ estado?: string }>;
}) {
  const { estado } = await searchParams;
  const data = buildFixture(estado);
  return (
    <div className="relative h-211 w-97.5 overflow-hidden">
      {/* `key` gör att Llegó/No vino-statusen startar om när ?estado= byts, i stället för
          att en gammal klientstate läcker mellan tillstånd. */}
      <HoyScreen key={estado ?? "default"} data={data} />
    </div>
  );
}
