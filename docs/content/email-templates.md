# Plantillas de correo (respaldo de WhatsApp)

> Fuente de la verdad para el código: `src/i18n/es-CL.ts` → `email`. El correo
> es el respaldo (F7): se envía cuando WhatsApp falla y el cliente dejó su
> correo. Mismos cuatro eventos que las plantillas de WhatsApp de
> confirmación, recordatorio, cancelación y cambio de hora.
>
> La confirmación incluye la política de cancelación completa, por la
> exigencia de SERNAC (Ley 19.496) de una confirmación **escrita** con
> condiciones; si no se envía, el plazo de retracto sube a 90 días (ver
> `docs/legal/COMPLIANCE.md`).
>
> No hay correo para la lista de espera en v1: esa función depende de una
> respuesta rápida por WhatsApp, y un correo llegaría demasiado tarde.

## 1. Reserva confirmada

**Asunto:** `Tu hora en {negocio} quedó confirmada`

**Cuerpo (texto plano, con saltos de párrafo para la versión HTML):**

```
Hola {cliente}:

Tu hora en {negocio} quedó confirmada.

Servicio: {servicio}
Día: {fecha}
Hora: {hora}
Profesional: {profesional}

Puedes cancelarla o cambiarla sin costo hasta {horasCancelacion} h antes,
desde este link: {linkGestion}

Te esperamos.
```

## 2. Recordatorio 24 h antes

**Asunto:** `Recordatorio: tu hora en {negocio} el {fecha}`

**Cuerpo:**

```
Hola {cliente}:

Te recordamos tu hora en {negocio}.

Servicio: {servicio}
Día: {fecha}
Hora: {hora}

Si necesitas cambiarla, entra aquí: {linkGestion}
```

## 3. Reserva cancelada

**Asunto:** `Tu hora en {negocio} fue cancelada`

**Cuerpo:**

```
Hola {cliente}:

Tu hora en {negocio} del {fecha} a las {hora} quedó cancelada.

Puedes reservar otra cuando quieras: {linkNuevaReserva}
```

## 4. Reserva movida

**Asunto:** `Tu hora en {negocio} cambió de horario`

**Cuerpo:**

```
Hola {cliente}:

Tu hora en {negocio} cambió.

Nuevo día: {fecha}
Nueva hora: {hora}
Profesional: {profesional}

Revisa el detalle aquí: {linkGestion}
```
