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
  },
}[market];
