/** Värdebevis (WP-69, D-057), svenska. Samma form som `es-CL.vales.ts`; egen
 * fil så att texterna inte hamnar i bokningssidans i18n-chunk (D-039). */
import type { vales as EsVales } from "./es-CL.vales";

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

export const vales: Widen<typeof EsVales> = {
  compra: {
    comprar: "Köp och välj tid",
    comprarCorto: "Köp",
    ingresar: "Logga in för att köpa",
    texto:
      "Du betalar med kort. Värdebeviset hamnar i ditt konto och du väljer tid när du vill.",
    vendido: (p: { negocio: string }): string =>
      `Säljs av ${p.negocio}. Betalningen går direkt till salongen.`,
    arrepentimiento: "14 dagars ångerrätt så länge det inte är använt.",
    agotado: "Slutsålt",
    error: "Betalningen kunde inte öppnas. Försök igen.",
    cancelado: "Du avbröt betalningen. Inget drogs.",
    noDisponible: "Erbjudandet går inte längre att köpa.",
  },
  cuenta: {
    meta: "Mina värdebevis",
    titulo: "Mina värdebevis",
    verTodos: (p: { n: number }): string => `Alla (${p.n})`,
    vacio:
      "Du har inga värdebevis än. Hitta erbjudanden nära dig och köp med kort.",
    explorar: "Upptäck erbjudanden",
    activos: "Att använda",
    anteriores: "Använda och utgångna",
    validoHasta: (p: { fecha: string }): string => `giltigt till ${p.fecha}`,
    valor: (p: { valor: string }): string => `Värde ${p.valor}`,
    reservar: "Välj tid",
    reservado: (p: { fecha: string }): string => `Bokad · ${p.fecha}`,
    arrepentirse: "Ångra köp",
    arrepentirseConfirmar:
      "Du får tillbaka hela beloppet på ditt kort. Värdebeviset slutar gälla.",
    arrepentido: "Klart. Pengarna är på väg tillbaka till ditt kort.",
    errorArrepentirse:
      "Återbetalningen gick inte. Försök igen eller kontakta salongen.",
    compraLista: "Klart! Ditt värdebevis finns här.",
    compraPendiente:
      "Vi bekräftar din betalning. Värdebeviset dyker upp här om en stund.",
    codigoAria: "Värdebevisets kod",
    estados: {
      active: "Aktivt",
      reserved: "Bokat",
      redeemed: "Använt",
      refunded: "Återbetalt",
      expired: "Utgånget",
      disputed: "Under utredning",
    },
    menu: "Mina värdebevis",
  },
  reserva: {
    aviso: (p: { codigo: string }): string =>
      `Betalt med värdebevis · ${p.codigo}`,
    avisoTexto:
      "Välj en tid före värdebevisets sista giltighetsdag. Du betalar inget mer.",
  },
  caja: {
    titulo: "Sålda värdebevis",
    enlace: "Värdebevis",
    vendidos: "Sålda",
    ingresos: "Försäljning",
    usados: "Använda",
    pendientes: "Att använda",
    vacio: "Du har inte sålt några värdebevis än.",
    columnas: {
      oferta: "Erbjudande",
      comprado: "Köpt",
      estado: "Status",
      valor: "Värde",
    },
    hora: (p: { fecha: string }): string => `Tid: ${p.fecha}`,
    nota: "Värdebevis betalas vid köpet och räknas som försäljning den dagen. En tid bokad med värdebevis har inget kvar att ta betalt för.",
  },
};
