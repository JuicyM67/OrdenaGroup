import "server-only";

import type { Market } from "@/config/brand";

import type { EmailTemplateMap, EmailTemplateName } from "./render";

/** Exempeldata per mall och marknad — används av testerna och av
 * `/design-lab/email`. Beloppen är redan formaterade (`formatMoney` körs av
 * anroparen i riktig kod, se `types.ts`), samma som resten av `email.*`. */
function base(market: Market) {
  const isSe = market === "SE";
  return {
    negocio: isSe ? "Klipp & Skägg" : "Barbería Norte",
    cliente: isSe ? "Erik" : "Joaquín",
    servicio: isSe ? "Klippning + skägg" : "Corte + barba",
    profesional: isSe ? "Alex" : "Diego",
    fecha: isSe ? "fredag 2 oktober" : "viernes 2 de octubre",
    hora: "15:00",
    direccion: isSe
      ? "Götgatan 12, Stockholm"
      : "Av. Providencia 1234, Providencia",
    precio: isSe ? "450 kr" : "$18.000",
  };
}

export function emailFixtures(market: Market): {
  [K in EmailTemplateName]: EmailTemplateMap[K];
} {
  const b = base(market);
  return {
    magicLink: {
      confirmUrl:
        "https://app.example.com/auth/confirm?token_hash=abc123&type=magiclink",
      token: "482913",
    },
    confirmation: {
      confirmUrl:
        "https://app.example.com/auth/confirm?token_hash=abc123&type=signup",
      token: "482913",
    },
    bienvenida: {
      negocio: b.negocio,
      agendaUrl: "https://app.example.com/app",
    },
    reservaConfirmada: {
      cliente: b.cliente,
      negocio: b.negocio,
      servicio: b.servicio,
      fecha: b.fecha,
      hora: b.hora,
      profesional: b.profesional,
      direccion: b.direccion,
      precio: b.precio,
      horasCancelacion: 4,
      linkGestion: "https://app.example.com/r/abc123",
    },
    recordatorio: {
      cliente: b.cliente,
      negocio: b.negocio,
      servicio: b.servicio,
      fecha: b.fecha,
      hora: b.hora,
      linkGestion: "https://app.example.com/r/abc123",
    },
    reservaMovida: {
      cliente: b.cliente,
      negocio: b.negocio,
      servicio: b.servicio,
      fecha: b.fecha,
      hora: b.hora,
      profesional: b.profesional,
      linkGestion: "https://app.example.com/r/abc123",
    },
    reservaCancelada: {
      cliente: b.cliente,
      negocio: b.negocio,
      fecha: b.fecha,
      hora: b.hora,
      linkNuevaReserva: "https://app.example.com/reservar",
    },
    nuevaReservaDueno: {
      negocio: b.negocio,
      cliente: b.cliente,
      servicio: b.servicio,
      fecha: b.fecha,
      hora: b.hora,
      agendaUrl: "https://app.example.com/app/agenda",
    },
    cancelacionDueno: {
      negocio: b.negocio,
      cliente: b.cliente,
      servicio: b.servicio,
      fecha: b.fecha,
      hora: b.hora,
      agendaUrl: "https://app.example.com/app/agenda",
    },
    listaEsperaCupo: {
      negocio: b.negocio,
      servicio: b.servicio,
      fecha: b.fecha,
      hora: b.hora,
      minutos: 15,
      confirmarUrl: "https://app.example.com/lista-espera/abc123",
    },
    horaFlash: {
      negocio: b.negocio,
      servicio: b.servicio,
      fecha: b.fecha,
      hora: b.hora,
      pct: 20,
      reservarUrl: "https://app.example.com/reservar?flash=abc123",
    },
    nuevaSolicitud: {
      negocio: b.negocio,
      cliente: b.cliente,
      servicio: b.servicio,
      fecha: b.fecha,
      hora: b.hora,
      agendaUrl: "https://app.example.com/app/agenda",
    },
    solicitudRecibida: {
      cliente: b.cliente,
      negocio: b.negocio,
      servicio: b.servicio,
      fecha: b.fecha,
      hora: b.hora,
      profesional: b.profesional,
      direccion: b.direccion,
      precio: b.precio,
      linkGestion: "https://app.example.com/r/abc123",
    },
    solicitudRechazada: {
      cliente: b.cliente,
      negocio: b.negocio,
      fecha: b.fecha,
      hora: b.hora,
      linkNuevaReserva: "https://app.example.com/reservar",
    },
    solicitudVencida: {
      cliente: b.cliente,
      negocio: b.negocio,
      fecha: b.fecha,
      hora: b.hora,
      linkNuevaReserva: "https://app.example.com/reservar",
    },
    invitacionEquipo: {
      negocio: b.negocio,
      invitadoPor: market === "SE" ? "Maria" : "María",
      acceptUrl: "https://app.example.com/app/invitacion/abc123",
    },
  };
}
