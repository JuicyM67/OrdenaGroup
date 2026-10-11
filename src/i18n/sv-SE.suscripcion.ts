/** Abonnemang (WP-78, D-059), svenska. Samma form som `es-CL.suscripcion.ts`;
 * egen fil så att texterna inte hamnar i bokningssidans i18n-chunk. */
import type { suscripcion as EsSuscripcion } from "./es-CL.suscripcion";

type Widen<T> = T extends string
  ? string
  : T extends number
    ? number
    : T extends boolean
      ? boolean
      : T extends (...args: infer A) => infer R
        ? (...args: A) => Widen<R>
        : T extends readonly (infer U)[]
          ? readonly Widen<U>[]
          : T extends object
            ? { readonly [K in keyof T]: Widen<T[K]> }
            : T;

export const suscripcion: Widen<typeof EsSuscripcion> = {
  titulo: "Abonnemang",
  planActual: "Din plan",
  estado: {
    prueba: (p: { fecha: string }): string => `Provperiod till ${p.fecha}`,
    activo: "Aktiv",
    fallido: "Betalningen misslyckades",
    termina: (p: { fecha: string }): string => `Avslutas ${p.fecha}`,
    pendiente: "Betalning pågår",
    piloto: (p: { fecha: string }): string => `Pilot till ${p.fecha}`,
  },
  proximaFactura: (p: { monto: string; fecha: string }): string =>
    `Nästa faktura: ${p.monto} den ${p.fecha}`,
  proximaFacturaSinMonto: (p: { fecha: string }): string =>
    `Nästa faktura den ${p.fecha}`,
  ivaIncluido: "inkl. moms",
  tarjeta: (p: { marca: string; ultimos: string }): string =>
    `${p.marca} ···· ${p.ultimos}`,
  sinTarjeta: "Inget kort sparat",
  diasPrueba: (p: { n: number }): string =>
    p.n === 1
      ? "1 dag kvar av provperioden"
      : `${p.n} dagar kvar av provperioden`,
  pruebaSinTarjeta: (p: { fecha: string; plan: string }): string =>
    `Lägg till ett kort före ${p.fecha} så fortsätter du med ${p.plan}. Annars går du över till Gratis – ingenting raderas.`,
  cambioPendiente: (p: { plan: string; fecha: string }): string =>
    `Byter till ${p.plan} den ${p.fecha}.`,
  terminaTexto: (p: { plan: string; fecha: string }): string =>
    `${p.plan} avslutas den ${p.fecha}. Därefter har du Gratis – ingenting raderas.`,
  fallidoTexto: (p: { plan: string; fecha: string }): string =>
    `Vi kunde inte dra betalningen. Uppdatera kortet före ${p.fecha} så behåller du ${p.plan}.`,
  pilotoTexto: (p: { fecha: string }): string =>
    `Din pilotperiod gäller till ${p.fecha}. Välj en plan innan dess så behåller du funktionerna.`,
  gratisTexto: (p: { n: number }): string =>
    `Prova vilken plan som helst gratis i ${p.n} dagar, utan kort.`,
  gratisSinPrueba: "Välj en plan när du vill. Du kan säga upp när du vill.",
  custom: "Din plan hanteras av oss – kontakta oss om du vill ändra den.",
  botones: {
    gestionar: "Hantera betalning",
    agregarTarjeta: "Lägg till kort",
    cancelar: "Säg upp",
    reanudar: "Återuppta",
    elegir: "Välj",
    actual: "Nuvarande",
    mantener: "Behåll",
    contacto: "Kontakta oss",
  },
  planes: {
    titulo: "Planer",
    porMes: "/mån",
    sinIva: "exkl. moms",
    gratisNota: "Kostar ingenting",
    prueba: (p: { n: number }): string => `${p.n} dagar gratis, utan kort`,
  },
  dialogo: {
    tituloInicio: (p: { plan: string }): string => `Starta ${p.plan}`,
    inicioPrueba: (p: { n: number; plan: string }): string =>
      `Prova ${p.plan} gratis i ${p.n} dagar. Du behöver inget kort – lägg till ett när du vill under provperioden.`,
    inicioSinPrueba: (p: { monto: string }): string =>
      `Du betalar ${p.monto} i månaden inkl. moms. Du kan säga upp när du vill.`,
    irAlPago: "Fortsätt",
    tituloCambio: (p: { plan: string }): string => `Byt till ${p.plan}`,
    hoy: "Att betala i dag",
    despues: "Därefter per månad",
    ivaDe: (p: { monto: string }): string => `varav moms ${p.monto}`,
    subeAhora: "Den nya planen gäller så fort betalningen har gått igenom.",
    bajaAlFinal: (p: { fecha: string }): string =>
      `Bytet gäller från den ${p.fecha}. Fram till dess har du kvar din nuvarande plan.`,
    enPrueba: "Bytet gäller direkt. Ingenting dras under provperioden.",
    confirmar: "Bekräfta",
    volver: "Avbryt",
    calculando: "Räknar …",
    tituloCancelar: (p: { plan: string }): string => `Säga upp ${p.plan}?`,
    textoCancelar: (p: { fecha: string }): string =>
      `Du har kvar planen till den ${p.fecha}. Sedan går du över till Gratis. Ingenting raderas – dina tjänster, kunder och bokningar finns kvar.`,
    confirmarCancelar: "Säg upp",
  },
  retorno: {
    listo: (p: { plan: string }): string => `Välkommen till ${p.plan}!`,
    procesando: "Vi bekräftar betalningen. Det kan ta en minut.",
    cancelado: "Du avbröt betalningen. Ingenting har ändrats.",
  },
  banner: {
    texto: (p: { fecha: string; plan: string }): string =>
      `Vi kunde inte dra betalningen. Uppdatera kortet före ${p.fecha} så behåller du ${p.plan}.`,
    cta: "Uppdatera kort",
  },
  condiciones:
    "Betalas månadsvis i förskott. En uppgradering debiteras direkt (proportionellt). Nedgradering och uppsägning gäller vid periodens slut. Ingen återbetalning för påbörjad period. En nedgradering raderar ingen data.",
  marcas: {
    visa: "Visa",
    mastercard: "Mastercard",
    amex: "American Express",
    otra: "Kort",
  },
  errores: {
    billing_unavailable: "Betalning av planer är inte tillgänglig just nu.",
    billing_not_owner: "Bara ägaren kan ändra planen.",
    billing_custom_plan:
      "Din plan hanteras av oss. Kontakta oss om du vill ändra den.",
    billing_payment_required:
      "Uppdatera först ditt kort under Hantera betalning.",
    billing_already_subscribed: "Du har redan ett aktivt abonnemang.",
    billing_no_subscription: "Du har inget aktivt abonnemang.",
    billing_invalid_plan: "Välj en av planerna.",
    billing_same_plan: "Du har redan den planen.",
    rate_limited:
      "Du har försökt många gånger. Vänta en stund och försök igen.",
    failed: "Det gick inte att genomföra. Försök igen.",
    unauthorized: "Logga in igen.",
  },
  email: {
    abonnemangBetalningMisslyckades: {
      asunto: "Vi kunde inte dra betalningen för ditt abonnemang",
      preheader: "Uppdatera kortet så behåller du din plan.",
      titulo: "Betalningen misslyckades",
      texto: (p: { plan: string; fecha: string }): string =>
        `Vi kunde inte dra betalningen för ${p.plan}. Uppdatera kortet före den ${p.fecha} så behåller du allt som det är.`,
      ayuda:
        "Blir det inte betalt går du över till Gratis. Ingenting raderas – dina tjänster, kunder och bokningar finns kvar.",
      cta: "Uppdatera kort",
      ctaFactura: "Bekräfta betalningen",
    },
    abonnemangNedgraderat: {
      asunto: "Ditt företag har nu planen Gratis",
      preheader:
        "Ingenting har raderats. Du kan välja en plan igen när du vill.",
      titulo: "Du har nu Gratis",
      texto: (p: { plan: string; motivo: string }): string =>
        p.motivo === "trial"
          ? `Din provperiod för ${p.plan} tog slut utan kort, så du har gått över till Gratis.`
          : p.motivo === "payment"
            ? `Vi kunde inte dra betalningen för ${p.plan}, så du har gått över till Gratis.`
            : p.motivo === "pilot"
              ? `Din pilotperiod med ${p.plan} är slut, så du har gått över till Gratis.`
              : `Ditt abonnemang på ${p.plan} har avslutats, så du har gått över till Gratis.`,
      ayuda:
        "Ingenting har raderats. Planens funktioner är låsta tills du väljer en plan igen.",
      cta: "Se planer",
    },
    abonnemangPilotSlutar: {
      asunto: (p: { dias: number }): string =>
        p.dias <= 3
          ? "Din pilotperiod slutar om några dagar"
          : "Din pilotperiod slutar om två veckor",
      preheader: "Välj en plan så behåller du funktionerna.",
      titulo: "Din pilotperiod slutar snart",
      texto: (p: { fecha: string }): string =>
        `Din pilotperiod slutar den ${p.fecha}. Därefter går du över till Gratis om du inte väljer en plan.`,
      ayuda:
        "Ingenting raderas när du går över till Gratis. Du kan prova en plan gratis i 14 dagar, utan kort.",
      cta: "Välj plan",
    },
  },
};
