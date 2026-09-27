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
| Lo que falta pagar en el local después del abono (texto visible: "El **resto** ($6.000) lo pagas en el local"; `saldo` es solo el nombre del parámetro que trae el monto) | **resto** | "saldo" como palabra visible (esa es la clave/parámetro, no el texto) |
| Marcar un pago como registrado en la base | **cobrar** / **cobrado** | "pagar" (ese verbo es del cliente) |
| Deshacer un pago mal registrado (`payments` no permite borrar, solo actualizar) | **anular pago** | "cancelar pago" (ambiguo con cancelar la reserva, GUIA §5) |
| Las personas que atienden en el negocio, en conjunto (paso 2 de onboarding) | **equipo** | — |
| Una persona que atiende | **profesional** | "empleado" (ver también la fila de arriba) |
| La URL que le compartes al cliente (`negocio.slug`, onboarding paso 4) | **link de reservas** | "enlace" |
| La página a la que lleva ese link (`/[slug]`, lo que el cliente ve y usa para reservar) | **página de reservas** | — (es un concepto distinto del link, no un sinónimo: el link se copia/comparte, la página se visita) |
| Categoría del negocio (`businesses.category`) | **rubro** | "categoría" (esa palabra se reserva para `services.category`) |

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
  recibir más ofertas." No se escriben en WP-03 (ver pregunta 2 del plan).

## 7. Consentimientos y textos legales (borrador)

- Los textos de consentimiento (`reserva.consentimientos`) y los avisos sobre
  WhatsApp son **borrador**, escritos por `copywriter-es-cl`, no por un
  abogado. `consentimientos.version` (hoy `"2026-10-v2"`, incluye las
  condiciones del abono desde WP-03b) se sube cada vez que cambia el texto:
  `es-CL.test.ts` liga la versión a un hash del contenido para que no se te
  olvide.
- **Tres versiones independientes (WP-03b).** No todo lo que el cliente o
  el dueño aceptan viaja en el mismo hash: cada acción tiene su propia
  versión, porque son pantallas y momentos distintos.
  - `reserva.consentimientos.version` (`"2026-10-v2"`): la pantalla de
    confirmar una reserva en `/[slug]`.
  - `reserva.waitlist.consentimientoVersion` (`"lista-espera-2026-10-v1"`):
    unirse a la lista de espera, una acción distinta de confirmar una
    reserva. La pantalla de unirse a la lista de espera **debe mostrar**,
    además de `waitlist.terminos`, quién trata los datos
    (`consentimientos.responsable({ negocio })`) y el link a la política de
    privacidad (`consentimientos.privacidadLinkTexto`): el hash de esta
    versión cubre los tres textos juntos, no solo `waitlist.terminos`.
  - `clientes.consentimientoManual.version` (`"manual-2026-10-v1"`): el
    dueño registra que un cliente walk-in o telefónico aceptó, guardado con
    `consent_channel = 'manual'`.
  Cada una tiene su propio hash en `es-CL.test.ts`, y las versiones viejas
  quedan registradas aunque ya no se usen (archivo inmutable, ver abajo).
- Ninguna casilla de consentimiento empieza marcada. La de marketing es
  siempre una casilla aparte de la de términos, nunca la misma casilla ni un
  texto combinado.
- El texto de marketing siempre nombra el negocio, el canal (WhatsApp) y la
  forma de darse de baja ("BAJA").
- Antes del piloto (WP-27) un abogado chileno debe revisar estos textos (ver
  R8 del plan de WP-03 y `docs/legal/COMPLIANCE.md`).
- **Archivo inmutable por versión (S4, seguridad).** Cada `consentimientos.version`
  que un cliente llegó a aceptar debe quedar guardada tal cual era ese día,
  aunque `es-CL.ts` cambie después: no basta con el hash del test, hace falta
  una copia legible del texto completo (WP-26, `RAT.md` en
  `docs/legal/COMPLIANCE.md`). El registro de qué versión aceptó cada
  cliente y cuándo es **append-only**: nunca se sobrescribe ni se borra una
  fila existente, solo se agregan filas nuevas (por corrección, revocación,
  etc.). Esto es requisito de producto para WP-26, no algo que resuelva
  `copywriter-es-cl`.

## 8. Errores de validación (formularios)

- Los mensajes de error de un campo describen **qué hacer**, no solo qué
  falló: "Escribe tu nombre." en vez de "Nombre inválido."
- Los códigos de error de teléfono del cliente en Reserva
  (`errores.reserva.telefono`) usan las mismas claves (en snake_case) que
  `PhoneError` en `src/lib/format/phone.ts` (WP-04): `empty`,
  `invalid_chars`, `not_chilean`, `invalid_length`, `not_mobile`,
  `invalid_prefix`. Lo mismo para `errores.reserva`/`errores.agenda`
  (`slot_taken`, `too_soon`, `outside_hours`, `waitlist_duplicate`,
  `too_far`, `service_not_offered`, `not_found`, `invalid_status`,
  `outside_cancel_window`, `invalid_input`, `business_unavailable`): la clave
  es el código real, no una traducción, para que `satisfies Record<Codigo,
  string>` funcione del lado de quien defina el tipo del código.
- **`validacion` (WP-03b):** mismo patrón para los campos que llena el
  dueño. Las claves son el código después del prefijo del esquema de
  `src/lib/format/schemas.ts` (`clp.out_of_range` → `validacion.clp.
  out_of_range`): `validacion.clp`, `validacion.rut`, `validacion.date`,
  `validacion.time` y `validacion.horaLocal` (`fromLocalStrict`, para
  bloqueos en un día de cambio de horario de verano).
- **Dos perspectivas de teléfono (WP-03b):** `errores.reserva.telefono`
  (WP-03) le habla al cliente ("Escribe tu número"). Cuando el dueño escribe
  el número de otra persona o el propio negocio, el tono cambia:
  `validacion.telefonoCliente` (el celular de un cliente, en Clientes o una
  reserva manual) y `validacion.telefonoNegocio` (el teléfono del propio
  negocio, que puede ser fijo, en el onboarding y en Ajustes). Los dos
  cubren los seis códigos de `PhoneError` más `invalid_type` e
  `invalid_format` del esquema.

## 9. Nombres de servicio neutrales (S5, seguridad)

El nombre de un servicio (`services.name`) viaja tal cual por WhatsApp y por
correo, dos canales que ni el negocio ni la plataforma controlan del todo
(quedan en el teléfono del cliente, en Meta, en Resend). Por eso, aunque el
texto lo escribe el dueño del negocio en Ajustes (F2, pantalla de WP-03b, no
de este paquete), la regla de producto es:

- Nunca un nombre de servicio de salud o íntimo con detalle clínico
  (diagnósticos, nombres de tratamientos médicos, condiciones de salud). Un
  kinesiólogo escribe "Sesión de kinesiología" o "Sesión (60 min)", nunca el
  diagnóstico ni el tratamiento específico del paciente (ni siquiera
  "rehabilitación", que ya sugiere una condición).
- Nunca datos que identifiquen algo sensible de la persona que reserva más
  allá del servicio en sí.
- Esto es una regla de producto y de validación en el formulario de
  servicios (WP-03b), no algo que `copywriter-es-cl` pueda arreglar en
  `es-CL.ts`: acá solo se documenta para que quien escriba esa pantalla la
  aplique.
- El texto de ayuda que aplica esta regla en la interfaz es
  `servicios.campos.nombreAyuda` (siempre visible, en onboarding y en
  Ajustes), con una versión más específica en
  `servicios.campos.nombreAyudaExtendida` para los rubros de kinesiología y
  estética.

### 9.1 Campos de anotaciones (minimización, Ley 21.719)

Ningún campo de notas libres pide ni sugiere anotar datos de salud:

- `clientes.notas.ayuda` y `agenda.manual.notasAyuda` (mismo texto, una sola
  definición: notas del cliente en su ficha y notas de una reserva manual):
  "Las ven tú y tus administradores, y el cliente puede pedir una copia de
  sus datos. No anotes datos de salud ni información sensible." (menciona el
  derecho del cliente a pedir copia de sus datos, revisión de seguridad
  2026-09-27).
- `horarios.bloqueos.notaAyuda` (nota de un bloqueo o ausencia, por ejemplo
  una licencia médica): "Solo tu equipo la ve. No anotes datos de salud."

## 10. Cómo revisar un texto nuevo

1. ¿Está en `docs/design/reference/*.dc.html`? Cópialo tal cual, incluyendo
   mayúsculas, tildes y los caracteres especiales (`·`, `−`, `ª`).
2. ¿Depende de un dato real? Hazlo una función con un objeto de parámetros
   con nombre, nunca interpola con `+` fuera de `es-CL.ts`.
3. ¿Nombra el producto? Usa `brand.name` o `brand.tagline`, nunca el nombre
   escrito a mano (`src/config/brand.test.ts` lo comprueba en todo `src/`, y
   `es-CL.test.ts` lo vuelve a comprobar con un mensaje más claro).
4. Pásalo por la lista negra del punto 1 (usted, voseo, "po", "wena",
   anglicismos, emoji) antes de darlo por terminado.
