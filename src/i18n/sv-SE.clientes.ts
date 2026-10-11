/** "För kunder" (landningssida för konsumentkontot) och inloggningsvalet i headern,
 * svenska. Samma form som `es-CL.clientes.ts`; egen fil så att texterna inte hamnar i
 * bokningssidans i18n-chunk. Produktnamnet kommer in som `{ nombre }`. */
import type { paraClientes as EsParaClientes } from "./es-CL.clientes";

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

export const paraClientes: Widen<typeof EsParaClientes> = {
  meta: {
    titulo: "Skapa gratis konto för dina bokningar",
    descripcion: ({ nombre }) =>
      `Samla alla dina bokningar, favoritsalonger, erbjudanden och presentkort i ett gratis konto på ${nombre}. Boka om eller avboka med ett klick.`,
    migas: "För kunder",
    inicio: "Start",
  },
  nav: {
    label: "För kunder",
    texto: "Samla dina bokningar gratis",
    entrarLabel: "Välj hur du loggar in",
    soyCliente: "Jag är kund",
    soyClienteTexto: "Se och hantera dina bokningar",
    tengoNegocio: "Jag har ett företag",
    tengoNegocioTexto: "Logga in i din kalender",
  },
  hero: {
    foto: "Kund som bokar en tid i mobilen",
    etiqueta: "För dig som bokar",
    pre: "Alla dina bokningar.",
    marca: "På ett ställe.",
    texto:
      "Skapa ett gratis konto och samla tider, favoritsalonger, erbjudanden och presentkort. Boka om eller avboka med ett klick.",
    emailLabel: "Din e-postadress",
    emailPlaceholder: "Din e-postadress",
    cta: "Skapa gratis konto",
    confianza: [
      { id: "gratis", texto: "Alltid gratis" },
      { id: "sinClave", texto: "Inget lösenord – en länk i mejlen" },
      { id: "datos", texto: "Data lagras i EU" },
    ],
  },
  tarjetas: {
    proxima: "NÄSTA BOKNING",
    dia: "TOR",
    numero: "15",
    servicio: "Klippning + styling",
    detalle: "14:30 · Salong Norrsken",
    favoritos: "3 favoritsalonger",
    favoritosTexto: "Boka igen med ett klick",
    flash: "Blixttid idag 16:30 · −25 %",
    flashTexto: "Nära dig i Upptäck",
  },
  funciones: {
    pre: "Allt du behöver som kund –",
    marca: "helt gratis",
    items: [
      {
        id: "reservas",
        titulo: "Alla bokningar samlade",
        texto:
          "Se kommande och tidigare tider hos alla salonger som använder tjänsten.",
      },
      {
        id: "cambiar",
        titulo: "Boka om eller avboka",
        texto:
          "Ändra din tid direkt i kontot – utan att ringa eller leta efter mejlet.",
      },
      {
        id: "favoritos",
        titulo: "Favoritsalonger",
        texto:
          "Spara dina favoriter och boka samma behandling igen med ett klick.",
      },
      {
        id: "ofertas",
        titulo: "Erbjudanden och blixttider",
        texto: "Hitta lediga tider med rabatt nära dig i Upptäck.",
      },
      {
        id: "vales",
        titulo: "Värdebevis och presentkort",
        texto:
          "Alla dina koder och saldon på ett ställe, redo att använda när du bokar.",
      },
      {
        id: "resenas",
        titulo: "Verifierade omdömen",
        texto: "Betygsätt dina besök – bara riktiga kunder kan lämna omdömen.",
      },
    ],
  },
  pasos: {
    titulo: "Klart på en minut",
    foto: "Kund under en behandling",
    cta: "Skapa gratis konto",
    items: [
      {
        titulo: "Skriv din e-post",
        texto: "Vi skickar en inloggningslänk. Inget lösenord att komma ihåg.",
      },
      {
        titulo: "Dina tider dyker upp",
        texto:
          "Har du bokat med samma e-post tidigare ser du bokningarna direkt.",
      },
      {
        titulo: "Boka smartare",
        texto:
          "Spara favoriter, hitta blixttider nära dig och boka igen med ett klick.",
      },
    ],
  },
  faq: {
    titulo: "Vanliga frågor",
    items: [
      {
        pregunta: "Kostar det något?",
        respuesta: "Nej. Kontot är gratis och kommer alltid att vara det.",
      },
      {
        pregunta: "Måste jag ha konto för att boka?",
        respuesta:
          "Nej, du kan boka som gäst. Med konto får du alla tider samlade och bokar snabbare.",
      },
      {
        pregunta: "Vilka salonger syns i mitt konto?",
        respuesta:
          "Alla salonger och kliniker som använder tjänsten där du bokat med samma e-post.",
      },
      {
        pregunta: "Hur raderar jag mitt konto?",
        respuesta:
          "Under Integritet i kontot. Där kan du också ladda ner all din data.",
      },
    ],
  },
  cierre: {
    titulo: "Din nästa tid är ett klick bort",
    texto: "Skapa ett konto, eller hitta en salong nära dig.",
    crear: "Skapa gratis konto",
    descubre: "Upptäck salonger",
  },
  banner: {
    titulo: "Samla alla dina bokningar i ett konto",
    texto: "Gratis, utan lösenord. Boka om och avboka med ett klick.",
    cta: "Skapa gratis konto",
  },
};
