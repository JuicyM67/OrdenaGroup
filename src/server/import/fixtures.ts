import "server-only";

/**
 * WP-66: fejkläget (`AI_IMPORT_FAKE=1`, lokalt/CI) — en realistisk
 * extraktion per marknad utan API-anrop, så att förhandsgranskning och
 * import kan testas utan nyckel. Påhittade företag och namn.
 */
import type { Market } from "@/config/market";

import type { Extraction } from "./extraction-schema";

const SE: Extraction = {
  business: {
    name: "Salong Lövet",
    about:
      "Familjär salong på Södermalm sedan 2012. Vi klipper, färgar och fixar bryn — alltid med tid för en kopp kaffe.",
    address: "Götgatan 48",
    city: "Stockholm",
    district: "Södermalm",
    phone: "08-641 22 10",
    email: "hej@salonglovet.example",
    website: "https://salonglovet.example",
    instagram: "@salonglovet",
    tiktok: null,
    facebook: "https://www.facebook.com/salonglovet",
    category: "peluqueria",
  },
  hours: [
    { weekday: 1, open: true, start: "09:00", end: "18:00" },
    { weekday: 2, open: true, start: "09:00", end: "18:00" },
    { weekday: 3, open: true, start: "09:00", end: "19:00" },
    { weekday: 4, open: true, start: "09:00", end: "19:00" },
    { weekday: 5, open: true, start: "09:00", end: "17:00" },
    { weekday: 6, open: true, start: "10:00", end: "15:00" },
    { weekday: 7, open: false, start: null, end: null },
  ],
  categories: ["Dam", "Herr", "Färg", "Bryn & fransar"],
  services: [
    {
      name: "Damklippning",
      description: "Tvätt, klippning och föning.",
      durationMin: 60,
      price: 695,
      priceFrom: false,
      category: "Dam",
    },
    {
      name: "Herrklippning",
      description: null,
      durationMin: 30,
      price: 450,
      priceFrom: false,
      category: "Herr",
    },
    {
      name: "Barnklippning (0–12 år)",
      description: null,
      durationMin: 30,
      price: 350,
      priceFrom: false,
      category: "Herr",
    },
    {
      name: "Slingor folie, halvt huvud",
      description: "Inklusive toning och föning.",
      durationMin: 120,
      price: 1495,
      priceFrom: true,
      category: "Färg",
    },
    {
      name: "Färgning utväxt",
      description: null,
      durationMin: 90,
      price: 1095,
      priceFrom: true,
      category: "Färg",
    },
    {
      name: "Bryn- och fransfärg",
      description: null,
      durationMin: 30,
      price: 395,
      priceFrom: false,
      category: "Bryn & fransar",
    },
    {
      name: "Konsultation",
      description: "Vi pratar igenom färg och form.",
      durationMin: null,
      price: null,
      priceFrom: false,
      category: null,
    },
  ],
  staff: [
    { name: "Maja", title: "Frisör & ägare" },
    { name: "Elin", title: "Frisör" },
    { name: "Johan", title: "Barberare" },
  ],
  images: {
    logoUrl: "https://salonglovet.example/logo.png",
    coverUrl: "https://salonglovet.example/omslag.jpg",
  },
  confidence: "high",
  notes: [
    "Konsultation saknar pris och längd på sidan.",
    "Lunchstängt 12–13 på lördagar visas som ett intervall.",
  ],
};

const CL: Extraction = {
  business: {
    name: "Barbería El Roble",
    about:
      "Barbería de barrio en Ñuñoa. Cortes clásicos, fade y perfilado de barba con navaja.",
    address: "Av. Irarrázaval 3120, local 4",
    city: "Santiago",
    district: "Ñuñoa",
    phone: "+56 9 8765 4321",
    email: null,
    website: null,
    instagram: "https://www.instagram.com/barberia.elroble/",
    tiktok: "@elroble.barber",
    facebook: null,
    category: "barberia",
  },
  hours: [
    { weekday: 1, open: true, start: "10:00", end: "20:00" },
    { weekday: 2, open: true, start: "10:00", end: "20:00" },
    { weekday: 3, open: true, start: "10:00", end: "20:00" },
    { weekday: 4, open: true, start: "10:00", end: "20:00" },
    { weekday: 5, open: true, start: "10:00", end: "21:00" },
    { weekday: 6, open: true, start: "10:00", end: "18:00" },
    { weekday: 7, open: false, start: null, end: null },
  ],
  categories: ["Cortes", "Barba", "Combos"],
  services: [
    {
      name: "Corte clásico",
      description: null,
      durationMin: 30,
      price: 10000,
      priceFrom: false,
      category: "Cortes",
    },
    {
      name: "Corte fade",
      description: "Degradado a máquina y terminación a tijera.",
      durationMin: 45,
      price: 13000,
      priceFrom: false,
      category: "Cortes",
    },
    {
      name: "Perfilado de barba",
      description: "Con navaja y toalla caliente.",
      durationMin: 30,
      price: 8000,
      priceFrom: false,
      category: "Barba",
    },
    {
      name: "Corte + barba",
      description: null,
      durationMin: 60,
      price: 17000,
      priceFrom: false,
      category: "Combos",
    },
    {
      name: "Corte niño",
      description: null,
      durationMin: 30,
      price: 8000,
      priceFrom: false,
      category: "Cortes",
    },
    {
      name: "Diseño / líneas",
      description: null,
      durationMin: 15,
      price: 3000,
      priceFrom: true,
      category: null,
    },
  ],
  staff: [
    { name: "Nico", title: "Barbero" },
    { name: "Seba", title: "Barbero" },
  ],
  images: { logoUrl: null, coverUrl: "https://elroble.example/portada.jpg" },
  confidence: "medium",
  notes: ["No encontramos el correo del negocio en la página de reservas."],
};

export function fakeExtraction(market: Market): Extraction {
  return structuredClone(market === "SE" ? SE : CL);
}
