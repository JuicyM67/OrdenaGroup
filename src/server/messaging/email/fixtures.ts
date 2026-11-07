import "server-only";

import type { EmailTemplateMap, EmailTemplateName } from "./render";

/** Exempeldata per mall — används av testerna och av
 * `/design-lab/email`. Beloppen är redan formaterade (`formatMoney` körs av
 * anroparen i riktig kod, se `types.ts`), samma som resten av `email.*`. */
const b = {
  negocio: "Barbería Norte",
  cliente: "Joaquín",
  servicio: "Corte + barba",
  profesional: "Diego",
  fecha: "viernes 2 de octubre",
  hora: "15:00",
  direccion: "Av. Providencia 1234, Providencia",
  precio: "$18.000",
};

export function emailFixtures(): {
  [K in EmailTemplateName]: EmailTemplateMap[K];
} {
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
    invitacionAdmin: {
      ingresarUrl:
        "https://app.example.com/auth/confirm?token_hash=abc&type=magiclink",
      adminUrl: "https://app.example.com/admin",
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
      invitadoPor: "María",
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
      telefono: "+56 9 1234 5678",
    },
    campanaMarketing: {
      negocio: b.negocio,
      texto: "Tenemos horario extendido esta semana. ¡Aprovecha de reservar!",
      offerPct: 20,
      offerValidUntil: "31 de octubre",
      reservarUrl: "https://app.example.com/barberia-norte?o=abc123",
      bajaUrl: "https://app.example.com/baja/abc123",
    },
    solicitudResena: {
      cliente: b.cliente,
      negocio: b.negocio,
      servicio: b.servicio,
      resenaUrl: "https://app.example.com/resena/abc123",
    },
    clienteQuiereCambiar: {
      negocio: b.negocio,
      cliente: b.cliente,
      servicio: b.servicio,
      fecha: b.fecha,
      hora: b.hora,
      agendaUrl: "https://app.example.com/app/agenda",
    },
  };
}
