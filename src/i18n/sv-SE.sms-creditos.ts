/** SMS-krediter (WP-76, D-053), svenska. Samma form som `es-CL.sms-creditos.ts`;
 * egen fil så att texterna inte hamnar i bokningssidans i18n-chunk. */
import type { smsCreditos as EsSmsCreditos } from "./es-CL.sms-creditos";

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

export const smsCreditos: Widen<typeof EsSmsCreditos> = {
  titulo: "SMS",
  intro:
    "Påminnelser och bekräftelser går först från planens SMS, sedan från dina krediter.",
  planChip: (p: { plan: string }): string => `Plan: ${p.plan}`,
  incluidos: (p: { mes: string }): string => `Ingår i planen · ${p.mes}`,
  incluidosCorto: "I planen",
  deMax: (p: { max: string }): string => `av ${p.max} SMS`,
  deMaxCorto: (p: { max: string }): string => ` / ${p.max}`,
  sinLimite: "Obegränsat i din plan",
  sinSmsEnPlan:
    "Din plan har inga SMS. Med krediter går påminnelserna som SMS direkt.",
  medidor: "Använda SMS i planen",
  recarga: (p: { fecha: string }): string => `Fylls på igen ${p.fecha}`,
  creditos: "Krediter",
  quedan: "SMS kvar",
  vence: (p: { fecha: string }): string => `Äldsta gäller till ${p.fecha}`,
  segmento: "1 SMS = 160 tecken. Längre meddelanden räknas som flera.",
  aviso: {
    fuerte: (p: { usado: string; max: string; mes: string }): string =>
      `Du har använt ${p.usado} av ${p.max} SMS i ${p.mes}.`,
    conCreditos:
      "När de är slut fortsätter påminnelserna från dina krediter, så att inga kunder missar sin tid.",
    sinCreditos:
      "När de är slut skickas påminnelserna som e-post. Fyll på med krediter så fortsätter de som SMS.",
    corto: (p: { usado: string; max: string; mes: string }): string =>
      `${p.usado} av ${p.max} SMS använda i ${p.mes}.`,
    cortoConCreditos: "Sedan tar krediterna vid.",
    cortoSinCreditos: "Sedan går påminnelserna som e-post.",
    agotado:
      "Månadens SMS och dina krediter är slut. Påminnelser skickas som e-post tills du fyller på.",
  },
  comprar: {
    titulo: "Fyll på SMS",
    sub: "1 kr per SMS. Gäller i 12 månader.",
    pronto: "Köp av SMS-krediter aktiveras snart.",
    subCorto: "1 kr per SMS · gäller i 12 månader · 160 tecken per SMS",
    leyenda: "Välj paket",
    paquete: (p: { n: string }): string => `${p.n} SMS`,
    porSms: (p: { precio: string }): string => `${p.precio}/SMS`,
    ahorro: (p: { monto: string }): string => `Spara ${p.monto}`,
    neto: "Pris exkl. moms",
    netoCorto: "Exkl. moms",
    iva: "Moms 25 %",
    total: "Att betala",
    pagar: (p: { monto: string }): string => `Betala ${p.monto}`,
    seguro:
      "Säker betalning med kort via Stripe. Kvitto skickas till din e-post.",
    seguroCorto: "Säker kortbetalning via Stripe",
  },
  confirmar: {
    titulo: "Bekräfta ditt köp",
    ivaParte: "Varav moms 25 %",
    validoHasta: "Giltiga till",
    texto:
      "Du skickas till Stripe för att betala med kort. Krediterna läggs till direkt när betalningen är klar, och kvittot kommer till din e-post.",
    ir: "Gå till betalning",
    cancelar: "Avbryt",
  },
  listo: {
    titulo: (p: { n: string }): string => `Klart! ${p.n} SMS har lagts till`,
    texto: (p: { saldo: string }): string =>
      `Du har nu ${p.saldo} krediter. Kvittot har skickats till din e-post.`,
    cajaTitulo: "Använd dem till att fylla kalendern",
    cajaTexto:
      "Skicka ett erbjudande till kunder som inte bokat på ett tag. Det tar två minuter.",
    ahoraNo: "Inte nu",
  },
  procesando: {
    titulo: "Betalningen behandlas",
    texto:
      "Krediterna läggs till så snart Stripe har bekräftat betalningen. Ladda om sidan om en liten stund.",
    ok: "Okej",
  },
  cancelado: "Betalningen avbröts. Inget har dragits från ditt kort.",
  marketing: {
    eyebrow: "Fyll luckorna i kalendern",
    titulo: "Ett SMS till dina stamkunder kan bli en full eftermiddag",
    paso1Fuerte: "Välj vilka som får det.",
    paso1: "T.ex. kunder som inte varit hos dig på 6 veckor.",
    paso2Fuerte: "Skriv ett kort erbjudande.",
    paso2: "Lägg gärna till dina blixttider, så bokar de direkt via länken.",
    paso3Fuerte: "Skicka eller schemalägg.",
    paso3: "Du ser hur många SMS det kostar innan du trycker på skicka.",
    ejemploLabel: "Exempel:",
    ejemplo: (p: { link: string }): string =>
      `”Hej Anna! Jag har lediga tider på torsdag med 20 % rabatt. Boka här: ${p.link}”`,
    ejemploCosto: "· 1 SMS",
    cta: "Skicka SMS-marknadsföring",
    alcance: (p: { n: string }): string =>
      `Du har ${p.n} krediter, räcker till ${p.n} kunder.`,
  },
  historial: {
    titulo: "Historik",
    fecha: "Datum",
    evento: "Händelse",
    creditos: "Krediter",
    recibo: "Kvitto",
    compra: (p: { n: string; monto: string }): string =>
      `Köpt ${p.n} SMS · ${p.monto} inkl. moms`,
    compraCorta: (p: { n: string }): string => `Köpt ${p.n} SMS`,
    uso: "Påminnelser utöver planen",
    ver: "Visa",
    vacio: "Inga köp än. Krediterna du köper visas här.",
    verTodo: "Visa alla",
    estado: {
      reembolsado: "Återbetald",
      reembolsoParcial: "Delvis återbetald",
      expirado: "Utgången",
    },
  },
  errores: {
    sms_credits_unavailable: "Köp av SMS är inte tillgängligt just nu.",
    sms_credits_invalid_package: "Välj ett av paketen.",
    forbidden: "Bara ägaren kan köpa SMS.",
    rate_limited:
      "Du har försökt många gånger. Vänta en stund och försök igen.",
    failed: "Det gick inte att öppna betalningen. Försök igen.",
    unauthorized: "Logga in igen och försök på nytt.",
  },
  campana: {
    cuota80: "Du har använt 80 % av månadens sms",
    agotados: "Dina sms är slut — påminnelser går nu som e-post",
    cta: "Fyll på sms",
  },
};
