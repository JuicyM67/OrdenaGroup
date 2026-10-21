import "server-only";

/**
 * WP-66: fejkläget (`AI_IMPORT_FAKE=1`, lokalt/CI) — en realistisk
 * extraktion utan API-anrop, så att förhandsgranskning och import kan
 * testas utan nyckel. Påhittat företag och namn.
 */
import type { Extraction } from "./extraction-schema";

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

export function fakeExtraction(): Extraction {
  return structuredClone(CL);
}
