# Plantillas de WhatsApp (Meta) — fase 1

> Listo para copiar y pegar en el administrador de WhatsApp Business (Meta).
> Fuente de la verdad para el código: `src/i18n/es-CL.ts` → `plantillasWhatsapp`.
> `whatsapp.test.ts` verifica que este documento y el código digan exactamente
> lo mismo: si cambias un texto acá, cámbialo también en `es-CL.ts` (y al
> revés).
>
> Las variables usan posición (`{{1}}`, `{{2}}`…) en vez de nombre, porque es
> el único formato que Meta garantiza para plantillas de idioma `es`. El orden
> de las variables es el contrato con `integrations-engineer` (WP-16): no se
> reordena sin avisar.
>
> Ningún nombre de plataforma aparece en los textos (el nombre que se vea en
> WhatsApp para el remitente todavía no está decidido — D-001 —, y si cambia
> no debe afectar estas plantillas). Solo se nombra el negocio del cliente.

## Antes de enviar a Meta

- Las **tres plantillas sin botón de URL** (`recordatorio_24h`,
  `lista_espera_oferta`, `lista_espera_tomada`) se pueden enviar a revisión
  apenas se apruebe este documento.
- Las **tres plantillas con botón de URL** (`reserva_confirmada`,
  `reserva_cancelada`, `reserva_movida`) esperan a que `brand.domain` esté
  definido (D-001): Meta exige una URL base fija al crear la plantilla, y
  cambiarla después obliga a crear una plantilla nueva. Mientras tanto, el
  campo `dominioPendiente` queda en `true` en `es-CL.ts`.
- Categoría: **UTILITY** en las seis (ninguna ofrece un descuento nuevo ni un
  incentivo: todas describen la propia reserva del cliente). Idioma: **es**
  (Meta no tiene `es_CL`; ver R4 del plan de WP-03).

---

## 1. `reserva_confirmada`

| Campo | Valor |
|---|---|
| Nombre | `reserva_confirmada` |
| Categoría | UTILITY |
| Idioma | es |
| Header | (ninguno) |
| Footer | (ninguno) |

**Body:**

```
Tu hora en {{1}} quedó confirmada, {{2}}: {{3}} el {{4}} a las {{5}} con {{6}}. Puedes cancelarla sin costo hasta {{7}} h antes.
```

**Variables:**

| # | Significado | Ejemplo | Fuente |
|---|---|---|---|
| 1 | Nombre del negocio | Barbería Norte | `businesses.name` |
| 2 | Nombre del cliente | Joaquín | `customers.first_name` |
| 3 | Servicio | Corte + barba | `services.name` |
| 4 | Fecha (día explícito, no relativo) | vie 2 oct | `bookings.starts_at` (America/Santiago) |
| 5 | Hora | 15:00 | `bookings.starts_at` (America/Santiago) |
| 6 | Profesional | Diego | `staff.name` |
| 7 | Horas del plazo de cancelación | 4 | `businesses.cancellation_window_hours` |

**Botones:**

| Tipo | Texto | Destino |
|---|---|---|
| URL (pendiente de dominio) | Ver mi reserva | `https://{dominio}/r/{{1}}` — sufijo: token de gestión, ejemplo `a1B2c3D4` (`bookings.management_token`) |

**Vista previa:**

> Tu hora en Barbería Norte quedó confirmada, Joaquín: Corte + barba el vie 2
> oct a las 15:00 con Diego. Puedes cancelarla sin costo hasta 4 h antes.
>
> [Ver mi reserva]

**Por qué es utility:** confirma una reserva que el propio cliente acaba de
hacer. No ofrece nada nuevo, solo detalla su compra.

---

## 2. `recordatorio_24h`

| Campo | Valor |
|---|---|
| Nombre | `recordatorio_24h` |
| Categoría | UTILITY |
| Idioma | es |
| Header | (ninguno) |
| Footer | (ninguno) |

**Body:**

```
Recordatorio de {{1}}, {{2}}: tu hora de {{3}} es el {{4}} a las {{5}}. Responde Confirmo o Necesito cambiar.
```

**Variables:**

| # | Significado | Ejemplo | Fuente |
|---|---|---|---|
| 1 | Nombre del negocio | Barbería Norte | `businesses.name` |
| 2 | Nombre del cliente | Joaquín | `customers.first_name` |
| 3 | Servicio | Corte + barba | `services.name` |
| 4 | Fecha (día explícito, nunca "mañana": ver R7 del plan) | vie 2 oct | `bookings.starts_at` (America/Santiago) |
| 5 | Hora | 15:00 | `bookings.starts_at` (America/Santiago) |

**Botones:**

| Tipo | Texto |
|---|---|
| Quick reply | Confirmo |
| Quick reply | Necesito cambiar |

**Vista previa:**

> Recordatorio de Barbería Norte, Joaquín: tu hora de Corte + barba es el vie
> 2 oct a las 15:00. Responde Confirmo o Necesito cambiar.
>
> [Confirmo] [Necesito cambiar]

**Por qué es utility:** recuerda una reserva ya confirmada por el cliente, sin
ofrecer nada nuevo.

**Nota sobre la fecha:** nunca se usa "mañana" ni "hoy". El envío ocurre 24 h
± 5 min antes de la hora reservada, y en un cambio de horario de verano (23 o
25 h de duración) o cerca de medianoche, una fecha relativa podría mostrar el
día equivocado.

---

## 3. `reserva_cancelada`

| Campo | Valor |
|---|---|
| Nombre | `reserva_cancelada` |
| Categoría | UTILITY |
| Idioma | es |
| Header | (ninguno) |
| Footer | (ninguno) |

**Body:**

```
Tu hora en {{1}} quedó cancelada, {{2}}: era el {{3}} a las {{4}}. Puedes reservar otra cuando quieras.
```

**Variables:**

| # | Significado | Ejemplo | Fuente |
|---|---|---|---|
| 1 | Nombre del negocio | Barbería Norte | `businesses.name` |
| 2 | Nombre del cliente | Joaquín | `customers.first_name` |
| 3 | Fecha de la hora cancelada | vie 2 oct | `bookings.starts_at` (America/Santiago) |
| 4 | Hora cancelada | 15:00 | `bookings.starts_at` (America/Santiago) |

**Botones:**

| Tipo | Texto | Destino |
|---|---|---|
| URL (pendiente de dominio) | Reservar de nuevo | `https://{dominio}/{{1}}` — sufijo: slug del negocio, ejemplo `barberia-norte` (`businesses.slug`) |

**Vista previa:**

> Tu hora en Barbería Norte quedó cancelada, Joaquín: era el vie 2 oct a las
> 15:00. Puedes reservar otra cuando quieras.
>
> [Reservar de nuevo]

**Por qué es utility:** confirma la cancelación de la propia reserva del
cliente. El botón lleva a la página de reservas del mismo negocio, sin
descuentos ni texto de venta.

**Riesgo (R5 del plan):** un botón para "reservar de nuevo" está cerca del
límite entre utility y marketing. Si Meta la reclasifica, se sube una versión
`reserva_cancelada_v2` sin botón (a coordinar con integrations-engineer) en
vez de cambiar el nombre existente.

---

## 4. `reserva_movida`

| Campo | Valor |
|---|---|
| Nombre | `reserva_movida` |
| Categoría | UTILITY |
| Idioma | es |
| Header | (ninguno) |
| Footer | (ninguno) |

**Body:**

```
Tu hora en {{1}} cambió, {{2}}: ahora es el {{3}} a las {{4}} con {{5}}.
```

**Variables:**

| # | Significado | Ejemplo | Fuente |
|---|---|---|---|
| 1 | Nombre del negocio | Barbería Norte | `businesses.name` |
| 2 | Nombre del cliente | Joaquín | `customers.first_name` |
| 3 | Nueva fecha | sáb 3 oct | `bookings.starts_at` (America/Santiago) |
| 4 | Nueva hora | 11:30 | `bookings.starts_at` (America/Santiago) |
| 5 | Profesional | Diego | `staff.name` |

**Botones:**

| Tipo | Texto | Destino |
|---|---|---|
| URL (pendiente de dominio) | Ver mi reserva | `https://{dominio}/r/{{1}}` — sufijo: token de gestión, ejemplo `a1B2c3D4` (`bookings.management_token`) |

**Vista previa:**

> Tu hora en Barbería Norte cambió, Joaquín: ahora es el sáb 3 oct a las
> 11:30 con Diego.
>
> [Ver mi reserva]

**Por qué es utility:** informa un cambio en la propia reserva del cliente,
hecho por el negocio.

---

## 5. `lista_espera_oferta`

| Campo | Valor |
|---|---|
| Nombre | `lista_espera_oferta` |
| Categoría | UTILITY |
| Idioma | es |
| Header | (ninguno) |
| Footer | (ninguno) |

**Body:**

```
Se liberó una hora en {{1}} para ti, {{2}}: {{3}} el {{4}} a las {{5}}. Tienes {{6}} min para responder antes de que se ofrezca a otra persona.
```

**Variables:**

| # | Significado | Ejemplo | Fuente |
|---|---|---|---|
| 1 | Nombre del negocio | Barbería Norte | `businesses.name` |
| 2 | Nombre del cliente | Joaquín | `customers.first_name` |
| 3 | Servicio | Corte + barba | `services.name` |
| 4 | Fecha | vie 2 oct | `bookings.starts_at` (America/Santiago) |
| 5 | Hora | 15:00 | `bookings.starts_at` (America/Santiago) |
| 6 | Minutos para responder | 15 | `waitlist_offers.expires_at − now()` |

**Botones:**

| Tipo | Texto |
|---|---|
| Quick reply | Sí, la quiero |
| Quick reply | No, gracias |

**Vista previa:**

> Se liberó una hora en Barbería Norte para ti, Joaquín: Corte + barba el vie
> 2 oct a las 15:00. Tienes 15 min para responder antes de que se ofrezca a
> otra persona.
>
> [Sí, la quiero] [No, gracias]

**Por qué es utility:** avisa sobre la propia inscripción del cliente en la
lista de espera del negocio; no es una promoción nueva ni un descuento.

---

## 6. `lista_espera_tomada`

| Campo | Valor |
|---|---|
| Nombre | `lista_espera_tomada` |
| Categoría | UTILITY |
| Idioma | es |
| Header | (ninguno) |
| Footer | (ninguno) |
| Botones | (ninguno) |

**Body:**

```
Esa hora en {{1}} ya fue tomada, {{2}}. Sigues en la lista de espera para el {{3}} y te avisaremos si se libera otra.
```

**Variables:**

| # | Significado | Ejemplo | Fuente |
|---|---|---|---|
| 1 | Nombre del negocio | Barbería Norte | `businesses.name` |
| 2 | Nombre del cliente | Joaquín | `customers.first_name` |
| 3 | Día por el que sigue esperando | sábado | `waitlist_entries.day` |

**Vista previa:**

> Esa hora en Barbería Norte ya fue tomada, Joaquín. Sigues en la lista de
> espera para el sábado y te avisaremos si se libera otra.

**Por qué es utility:** informa el resultado de la propia oferta que se le
hizo al cliente.

---

## Mensajes de sesión (fritext, sin revisión de Meta)

Estos mensajes se envían dentro de la ventana de 24 h que abre el cliente al
responder, así que no son plantillas y no pasan por la revisión de Meta. Están
en `src/i18n/es-CL.ts` → `whatsappSesion`.

| Situación | Texto |
|---|---|
| Cliente respondió *Confirmo* | "¡Gracias por confirmar! Te esperamos." |
| Cliente respondió *Necesito cambiar* | "Sin problema. Cambia tu hora aquí: {link de gestión}" |
| *Sí, la quiero* — la hora quedó tomada por el cliente | "¡Lista! Tu hora de {servicio} quedó para el {fecha} a las {hora}." |
| *Sí, la quiero* — otra persona fue más rápida | "Esa hora ya fue tomada por otra persona. Sigues en la lista de espera." |
| Cliente respondió *No, gracias* | "Listo, seguimos avisándote si se libera otra hora." |
| El plazo para responder ya venció | "El tiempo para responder ya pasó. Te avisaremos si se libera otra hora." |
| Mensaje de texto libre que no reconocemos | "No entendimos tu mensaje. Escribe directo al {teléfono del negocio} si necesitas ayuda." |

---

## Fuera de alcance de WP-03

Las plantillas de marketing (`hora_flash`, `te_echamos_de_menos`) y el
resumen semanal (`resumen_semanal`) se escriben en WP-30, WP-31 y WP-33 (fase
2), junto con el mensaje de código de acceso (`codigo_acceso`, categoría
AUTHENTICATION) que falta para el inicio de sesión del dueño (ver
`docs/tasks/IDEAS.md`).
