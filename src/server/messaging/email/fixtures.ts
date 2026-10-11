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
    invitacionNegocio: {
      negocio: b.negocio,
      aceptarUrl: "https://app.example.com/app/bienvenida/abc123",
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
    listaEsperaTomada: {
      cliente: b.cliente,
      negocio: b.negocio,
      fecha: b.fecha,
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
    bienvenidaMiembro: {
      cliente: b.cliente,
      negocio: b.negocio,
      pct: 10,
      linkReserva: "https://app.example.com/barberia-norte",
    },
    solicitudCancelacion: {
      negocio: b.negocio,
      cliente: b.cliente,
      servicio: b.servicio,
      fecha: b.fecha,
      hora: b.hora,
      agendaUrl:
        "https://app.example.com/app/solicitudes/3f1c2a4e-0000-4000-8000-000000000001",
    },
    cancelacionRechazada: {
      cliente: b.cliente,
      negocio: b.negocio,
      fecha: b.fecha,
      hora: b.hora,
      telefono: market === "SE" ? "+46 70 123 45 67" : "+56 9 1234 5678",
    },
    campanaMarketing: {
      negocio: b.negocio,
      texto:
        market === "SE"
          ? "Vi har öppet lite längre den här veckan. Passa på att boka en tid!"
          : "Tenemos horario extendido esta semana. ¡Aprovecha de reservar!",
      offerPct: 20,
      offerValidUntil: market === "SE" ? "31 oktober" : "31 de octubre",
      reservarUrl: "https://app.example.com/barberia-norte?o=abc123",
      bajaUrl: "https://app.example.com/baja/abc123",
    },
    solicitudResena: {
      cliente: b.cliente,
      negocio: b.negocio,
      servicio: b.servicio,
      resenaUrl: "https://app.example.com/resena/abc123",
    },
    smsCuota80: {
      negocio: b.negocio,
      usado: 120,
      max: 150,
      planUrl: "https://app.example.com/app/ajustes/plan",
    },
    smsAgotados: {
      negocio: b.negocio,
      usado: 150,
      max: 150,
      planUrl: "https://app.example.com/app/ajustes/plan",
    },
    valeComprado: {
      negocio: b.negocio,
      titulo: "Klippning + styling",
      codigo: "BB-7K2Q-94MZ",
      valor: market === "SE" ? "890 kr" : "$8.900",
      validoHasta: market === "SE" ? "24 okt. 2027" : "24 oct 2027",
      direccion: "Storgatan 1",
      reservarUrl: "https://app.example.com/barberia-norte?vardebevis=abc",
    },
    abonnemangBetalningMisslyckades: {
      negocio: b.negocio,
      plan: market === "SE" ? "Team" : "Equipo",
      fecha: market === "SE" ? "25 oktober" : "25 de octubre",
      planUrl: "https://app.example.com/app/ajustes/plan",
      facturaUrl: null,
    },
    abonnemangNedgraderat: {
      negocio: b.negocio,
      plan: market === "SE" ? "Team" : "Equipo",
      motivo: "payment",
      planUrl: "https://app.example.com/app/ajustes/plan",
    },
    abonnemangPilotSlutar: {
      negocio: b.negocio,
      fecha: market === "SE" ? "1 november" : "1 de noviembre",
      dias: 14,
      planUrl: "https://app.example.com/app/ajustes/plan",
    },
  };
}
