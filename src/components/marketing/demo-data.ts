// Exempeldata per marknad för hemsidans mockups (dekoration, inte UI-text).
import { market } from "@/config/brand";
import { WEEKDAY_MIN } from "@/lib/format/calendar-es-CL";
import { formatClp } from "@/lib/format/clp";

export const DEMO = {
  CL: {
    dagar: WEEKDAY_MIN,
    tjanster: ["Corte", "Color", "Uñas", "Masaje", "Barba"],
    kort: "Corte + barba",
    pris: formatClp(12_000),
    tjanst2: "Color",
    pris2: formatClp(18_000),
    kund: "Joaquín Rivas",
    lank: "tunegocio.cl/reservar",
    telefono: "+56 9 …",
    onsdag: "MIÉ",
    // Beloppet i hero-bentogridets "Comisión"-ruta, formaterat per marknad (regel dura 5).
    comisionFinal: formatClp(0),
    // Mockup del "wallet" en `partner-stampello.tsx` (WP-fixar-sv): nombre del negocio y
    // premio de ejemplo para la tarjeta de sellos, decoración, no UI-text real.
    walletNegocio: "Barbería Central",
    walletPremio: "Café gratis",
  },
  SE: {
    dagar: ["Mån", "Tis", "Ons", "Tor", "Fre", "Lör", "Sön"],
    tjanster: ["Klippning", "Färg", "Naglar", "Massage", "Skägg"],
    kort: "Klippning + skägg",
    pris: "450 kr",
    tjanst2: "Färgning",
    pris2: "895 kr",
    kund: "Elsa Lindqvist",
    lank: "dittforetag.se/boka",
    telefono: "+46 70 …",
    onsdag: "ONS",
    comisionFinal: "0 kr",
    walletNegocio: "Salong Nova",
    walletPremio: "Gratis kaffe",
  },
}[market];
