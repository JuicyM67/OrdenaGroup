// TODO_COPY (WP-03b, se docs/tasks/plans/WP-12.md FRÅGA 6): tre strängar saknas ännu i
// `src/i18n/es-CL.ts` (som WP-12 inte äger). Ägaren godkände att lägga till dem i WP-03b;
// tills dess bor exakt de här tre platshållarna här, medvetet formaterade likadant som
// texten i docs/design/reference/Agenda.dc.html, så att den visuella jämförelsen (< 2 %)
// inte påverkas. Byt ut mot `agenda.bloque.meta`/`agenda.bloque.aria`/
// `agenda.panel.minimoUnProfesional` från `@/i18n` i en egen PR så fort WP-03b landar —
// ändra ingenting annat i den PR:en.
export const pendingCopy = {
  /** "10:00 · Corte" — blockets tidsrad (EventBlock, bara bokningar, se DESIGN.md §3 "event"). */
  bloqueMeta: (p: { hora: string; detalle: string }): string =>
    `${p.hora} · ${p.detalle}`,
  /** Tillgängligt namn för ett bokningsblock (skärmläsare, inte synlig text). */
  bloqueAria: (p: {
    cliente: string;
    servicio: string;
    rango: string;
    profesional: string;
  }): string => `${p.cliente}, ${p.servicio}, ${p.rango}, con ${p.profesional}`,
  /** Förklaring när den sista synliga profesionalen inte kan kryssas ur (aria-describedby). */
  panelMinimoUnProfesional:
    "Debe quedar al menos un profesional visible en la agenda.",
} as const;
