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
>
> `{cliente}` es el primer nombre (misma fuente que la variable 2 de las
> plantillas de WhatsApp: primera palabra de `customers.name`).
>
> **Para WP-16 (seguridad, B1):** el seguimiento de clics y de apertura de
> Resend va **desactivado** en estos cuatro correos — el link de gestión no
> puede pasar por un redirect de terceros, porque eso expondría el token en
> otro dominio y en los logs de Resend. El remitente usa el dominio de la
> plataforma (no el del negocio) con `reply-to` apuntando al negocio, para
> que un "Responder" del cliente le llegue directo al negocio.

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

## 5. Acceso (Supabase Auth, WP-03b)

**Fuente:** `email.acceso` en `src/i18n/es-CL.ts`. Son textos **fijos**, no
funciones: `{{ .ConfirmationURL }}` y `{{ .Token }}` son variables de
plantilla de Supabase (sintaxis Go), no interpolación de `es-CL.ts`, y deben
copiarse **tal cual** a `supabase/templates/*.html` (WP-15). `brand.name`
aparece una vez en cada asunto, como remitente. Vencen en 15 minutos
(`otp_expiry = 900`, ver `docs/tech/SUPABASE_CONFIG.md`).

### 5.1 Link mágico (inicio de sesión)

**Asunto:** `email.acceso.magicLink.asunto`

```
Haz clic en este link para entrar a tu cuenta:

{{ .ConfirmationURL }}

O escribe este código en la pantalla de acceso: {{ .Token }}

El link y el código vencen en 15 minutos. Si no pediste este correo, puedes
ignorarlo.

No compartas este código con nadie. Nunca te lo vamos a pedir por WhatsApp
ni por teléfono.
```

### 5.2 Confirmación (cuenta nueva, `enable_confirmations` en prod)

**Asunto:** `email.acceso.confirmation.asunto`

```
Haz clic en este link para confirmar tu cuenta y entrar:

{{ .ConfirmationURL }}

O escribe este código en la pantalla de acceso: {{ .Token }}

El link y el código vencen en 15 minutos. Si no creaste esta cuenta, puedes
ignorar este correo.

No compartas este código con nadie. Nunca te lo vamos a pedir por WhatsApp
ni por teléfono.
```

## 6. Abono (Mercado Pago, WP-03b, F11)

**Fuente:** `email.abono.lineaConfirmacion({ monto, saldo, condiciones })`.
No es un correo aparte: WP-16/25 agregan esta línea dentro del cuerpo de
"Reserva confirmada" (§1) cuando el servicio tiene abono, porque una nueva
propiedad opcional en `email.reservaConfirmada.cuerpo` rompería su tipo. La
línea cumple la exigencia de confirmación **escrita** con condiciones
(SERNAC, Ley 19.496; ver la nota al inicio de este documento).

```
Pagaste {monto} de abono. El resto ({saldo}) lo pagas en el local.
{condiciones}
```

`{condiciones}` es el resultado de
`abono.reserva.condiciones({ negocio, horas })` (D-022, regla del abono):
explica que **el negocio** (nunca la plataforma, D-008) devuelve el abono si
se cancela hasta `horas` h antes, que se lo queda si se cancela después o si
el cliente no viene, que el abono se mantiene si solo se cambia la hora, y
que el negocio lo devuelve si es él quien cancela.

## 7. Pie de página (los cuatro correos de reserva)

`email.pie({ negocio, plataforma })`. `{plataforma}` se recibe como
parámetro (no está escrito a mano en `es-CL.ts`): quien arma el correo en
WP-16 decide qué nombre de plataforma mostrar.

```
Recibes este correo porque reservaste en {negocio} a través de {plataforma}.
```
