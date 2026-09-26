# Guía de estilo — español de Chile

> Todo el texto de producto (UI, plantillas de WhatsApp, correos) sigue esta
> guía. Dueño: `copywriter-es-cl`. Fuente del texto: `src/i18n/es-CL.ts`.
> Ningún componente escribe su propio texto (regla dura 6 de `CLAUDE.md`).

## 1. Tono

- **Tú**, siempre. Nunca "usted" ni "ustedes".
- Sin voseo rioplatense: nunca "podés", "tenés", "querés", "sabés", "reservá",
  "elegí". Se dice "puedes", "tienes", "quieres", "sabes", "reserva", "elige".
- Sin jerga que pueda leerse como poco seria en un sistema de pago: nunca "po"
  ni "wena", aunque sean naturales en una conversación oral.
- Sin anglicismos evitables: "reserva" (no "booking"), "confirmar llegada" (no
  "check-in"). Sí se dejan los que ya son de uso corriente y no tienen un
  equivalente corto y claro (p. ej. "WhatsApp", "email"/"correo").
- Como una buena recepcionista: cercana, breve y clara. Nunca como un banco
  (nada de "estimado usuario", "se informa que").
- Sin emoji en la interfaz (DESIGN.md §1: "aldrig emoji"). En WhatsApp
  tampoco, para mantener el mismo tono en los dos canales.

## 2. Palabras que usamos siempre igual

| Concepto | Se dice | No se dice |
|---|---|---|
| La cita del cliente | **hora** (cara al cliente: "tu hora", "la hora") | "cita", "turno" |
| La cita en la vista del dueño | **reserva** (agenda, lista, base de datos) | — |
| Quien atiende | **profesional** | "empleado", "trabajador" |
| Quien compra | **cliente** | "usuario" (reservamos "usuario" para cuentas internas, si acaso) |
| Pago adelantado | **abono** | "seña" |
| Cola de espera de un día lleno | **lista de espera** | "waitlist" |
| Falta a la hora reservada | **inasistencia** (en estadísticas), **No vino** (botón) | "no-show" |
| Opción de "cualquier profesional" | **Cualquiera** | "Cualquier profesional", "Sin preferencia" |
| Visita número N de un cliente | **"3.ª visita"** (ordinal femenino, con `.ª`) | "3era visita", "visita Nº 3" |
| URL que le mandamos al cliente | **link** ("link de gestión") | "enlace" (se entiende, pero no es el que usamos) |

## 3. Formato

- Plata: `$18.000` (símbolo `$`, punto como separador de miles, sin
  decimales). Nunca "18000" ni "$18.000,00".
- Fechas cortas: "Vie 2 oct". Fechas largas (WhatsApp y correo): "viernes 2 de
  octubre" (día de la semana y mes en minúscula). Los nombres de días y meses
  viven en `src/lib/format/` (WP-04), no en `src/i18n/`: acá solo se arman las
  frases que los rodean.
- Hora: reloj de 24 horas, "15:00" (nunca "3:00 pm").
- Duración de un servicio ("35 min"): la arma por completo
  `formatDuration` en `src/lib/format/` (WP-04). No hay una función propia
  para esto en `es-CL.ts`.
- Signo menos tipográfico `−` (U+2212), no un guion `-`, en los descuentos:
  "−20%" (ver DESIGN.md §3). Las funciones que arman estos textos en
  `es-CL.ts` usan `−`.
- Punto medio `·` (U+00B7) para separar partes de una misma línea:
  "Corte + barba · con Diego".
- Ordinal femenino con `.ª` (no `.a`, no `°`): "1.ª visita", "6.ª visita".
- Teléfono: se muestra en el formato que entrega `src/lib/format/` (E.164 se
  guarda en la base, nunca se muestra tal cual al cliente).

## 4. `aria-label` y cuándo usar una función en vez de un texto fijo

- Todo botón de solo ícono tiene un `aria-label` en español, con el mismo
  vocabulario que el texto visible equivalente (p. ej. el botón "Nueva
  reserva" del riel usa el mismo texto que el botón con texto visible del
  encabezado, no una variante).
- Un texto es una **función** en `es-CL.ts` cuando cambia con datos reales:
  nombres propios, números que se flexionan ("1 reserva" / "2 reservas"),
  fechas y horas ya formateadas, o cuando arma una frase con dos o más partes
  variables (p. ej. `agenda.popover.pagoLinea({ precio, monto })`). Si el
  texto es exactamente igual siempre, es un `string` fijo.
- Las funciones reciben **un solo objeto con parámetros con nombre**, nunca
  parámetros posicionales, para que un error de orden no pase inadvertido.
- Las funciones de `es-CL.ts` nunca calculan tiempo relativo ("hace 5 min",
  "en 20 min") ni construyen una fecha: eso lo calcula
  `src/lib/format/`/el servidor de agendamiento (WP-04), para no
  equivocarnos con el horario de verano ni con la medianoche (ver R7 del plan
  de WP-03). Lo que sí vive acá es la **frase** alrededor de ese número: WP-04
  entrega `{ n }` o `{ h, m }`, y `hoy.relativo.{ahora, enMin, enHoras,
  atrasado}` arma "en 20 min", "en 1 h 15 min", etc. Mismo patrón para
  `inicio.hero.horas({ n })` ("1 hora" / "4 horas").

## 5. Botones y confirmaciones destructivas

- "Cancelar" a secas **nunca** se usa cerca de una acción sobre una reserva,
  porque es ambiguo con cancelar la propia reserva. El botón destructivo se
  llama siempre **"Cancelar reserva"**, y el botón para cerrar un diálogo sin
  cancelar se llama **"Volver"** o **"No, mantener"** (nunca "Cancelar").
- Toda acción que le manda un WhatsApp al cliente sin que él lo haya pedido en
  ese momento (mover una hora, cancelarla desde la agenda) se confirma antes,
  con un texto que dice explícitamente "se le avisará por WhatsApp".

## 6. WhatsApp

- Las plantillas (`plantillasWhatsapp`) nunca usan palabras de venta
  ("descuento", "oferta", "gratis", "%", "promo"): son utility, describen la
  propia reserva del cliente. Ver `docs/content/whatsapp-templates.md`.
- Las plantillas nunca nombran la plataforma, solo el negocio del cliente
  (D-007): el nombre visible del remitente en WhatsApp no está decidido
  todavía (D-001), y así un cambio de nombre no obliga a rehacer las
  plantillas.
- `recordatorio_24h` nunca dice "mañana" ni "hoy": siempre una fecha
  explícita, por el riesgo de equivocarse de día cerca de medianoche o en un
  cambio de horario de verano (R7).
- Las plantillas de marketing (fase 2: `hora_flash`, `te_echamos_de_menos`)
  siempre terminan con la opción de baja: "Responde BAJA si no quieres
  recibir más ofertas." No se escriben en WP-03 (ver FRÅGA 2 del plan).

## 7. Consentimientos y textos legales (borrador)

- Los textos de consentimiento (`reserva.consentimientos`) y los avisos sobre
  WhatsApp son **borrador**, escritos por `copywriter-es-cl`, no por un
  abogado. `consentimientos.version` (hoy `"2026-10-v1"`) se sube cada vez
  que cambia el texto: `es-CL.test.ts` liga la versión a un hash del
  contenido para que no se te olvide.
- Ninguna casilla de consentimiento empieza marcada. La de marketing es
  siempre una casilla aparte de la de términos, nunca la misma casilla ni un
  texto combinado.
- El texto de marketing siempre nombra el negocio, el canal (WhatsApp) y la
  forma de darse de baja ("BAJA").
- Antes del piloto (WP-27) un abogado chileno debe revisar estos textos (ver
  R8 del plan de WP-03 y `docs/legal/COMPLIANCE.md`).

## 8. Errores de validación (formularios)

- Los mensajes de error de un campo describen **qué hacer**, no solo qué
  falló: "Escribe tu nombre." en vez de "Nombre inválido."
- Los códigos de error de teléfono del cliente en Reserva
  (`errores.reserva.telefono`) usan las mismas claves (en snake_case) que
  `chileanMobileInputSchema` en `src/lib/format/schemas.ts` (WP-04):
  `invalid_type`, `empty`, `invalid_chars`, `not_chilean`, `invalid_length`,
  `not_mobile`. Lo mismo para `errores.reserva`/`errores.agenda`
  (`slot_taken`, `too_soon`, `outside_hours`, `waitlist_duplicate`): la clave
  es el código real, no una traducción, para que `satisfies Record<Codigo,
  string>` funcione del lado de quien defina el tipo del código. El teléfono
  del negocio (que puede ser fijo) y los esquemas de CLP, RUT, fecha y hora se
  escriben en WP-03b, cuando esas pantallas entren en alcance.

## 9. Cómo revisar un texto nuevo

1. ¿Está en `docs/design/reference/*.dc.html`? Cópialo tal cual, incluyendo
   mayúsculas, tildes y los caracteres especiales (`·`, `−`, `ª`).
2. ¿Depende de un dato real? Hazlo una función con un objeto de parámetros
   con nombre, nunca interpola con `+` fuera de `es-CL.ts`.
3. ¿Nombra el producto? Usa `brand.name` o `brand.tagline`, nunca el nombre
   escrito a mano (`src/config/brand.test.ts` lo comprueba en todo `src/`, y
   `es-CL.test.ts` lo vuelve a comprobar con un mensaje más claro).
4. Pásalo por la lista negra del punto 1 (usted, voseo, "po", "wena",
   anglicismos, emoji) antes de darlo por terminado.
