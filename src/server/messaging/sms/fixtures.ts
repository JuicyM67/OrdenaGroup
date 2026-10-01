import "server-only";

import type { Market } from "@/config/brand";

import type { SmsTemplateMap, SmsTemplateName } from "./render";

function base(market: Market) {
  const isSe = market === "SE";
  return {
    negocio: isSe ? "Klipp & Skägg" : "Barbería Norte",
    cliente: isSe ? "Erik" : "Joaquín",
    servicio: isSe ? "Klippning + skägg" : "Corte + barba",
    fecha: isSe ? "fre 2/10" : "vie 2 oct",
    hora: "15:00",
  };
}

export function smsFixtures(market: Market): {
  [K in SmsTemplateName]: SmsTemplateMap[K];
} {
  const b = base(market);
  const link = "https://app.example.com/r/abc123";
  const solicitudLink =
    "https://app.example.com/app/solicitudes/3f1c2a4e-0000-4000-8000-000000000001";
  return {
    reservaConfirmada: {
      negocio: b.negocio,
      fecha: b.fecha,
      hora: b.hora,
      link,
    },
    recordatorio: { negocio: b.negocio, fecha: b.fecha, hora: b.hora, link },
    recordatorioHoy: { negocio: b.negocio, hora: b.hora, link },
    reservaMovida: { negocio: b.negocio, fecha: b.fecha, hora: b.hora, link },
    reservaCancelada: {
      negocio: b.negocio,
      fecha: b.fecha,
      hora: b.hora,
      link,
    },
    solicitudRechazada: {
      negocio: b.negocio,
      fecha: b.fecha,
      hora: b.hora,
      link,
    },
    solicitudVencida: {
      negocio: b.negocio,
      fecha: b.fecha,
      hora: b.hora,
      link,
    },
    listaEsperaCupo: {
      negocio: b.negocio,
      servicio: b.servicio,
      fecha: b.fecha,
      hora: b.hora,
      link,
      minutos: 15,
    },
    horaFlash: { negocio: b.negocio, hora: b.hora, pct: 20, link },
    nuevaReservaDueno: {
      cliente: b.cliente,
      servicio: b.servicio,
      fecha: b.fecha,
      hora: b.hora,
    },
    nuevaSolicitudDueno: {
      cliente: b.cliente,
      fecha: b.fecha,
      hora: b.hora,
      link: solicitudLink,
    },
    solicitudCancelacionDueno: {
      cliente: b.cliente,
      fecha: b.fecha,
      hora: b.hora,
      link: solicitudLink,
    },
    cancelacionRechazada: {
      negocio: b.negocio,
      fecha: b.fecha,
      hora: b.hora,
      telefono: market === "SE" ? "+46 70 123 45 67" : "+56 9 1234 5678",
    },
    codigoAcceso: { codigo: "482913" },
    mensajeLibre: {
      negocio: b.negocio,
      texto:
        market === "SE"
          ? "Vi har öppet imorgon också!"
          : "¡Mañana también abrimos!",
    },
  };
}
