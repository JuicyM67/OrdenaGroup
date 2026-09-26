# Contenido — qué hay dónde

Dueño: `copywriter-es-cl`. Ámbito de esta carpeta y de `src/i18n/` (WP-03,
F5–F8): Reserva (`/[slug]`), la reserva del cliente (`r/[token]`), Inicio,
Agenda, Hoy, las seis plantillas de WhatsApp de la fase 1 y el respaldo por
correo. Onboarding, Clientes, Caja, Ajustes y el abono con Mercado Pago se
escriben en **WP-03b** (antes de WP-15, WP-21, WP-24 y WP-25).

## Dónde está cada cosa

| Qué | Dónde |
|---|---|
| Todos los textos de la interfaz (Reserva, `r/[token]`, Inicio, Agenda, Hoy) | `src/i18n/es-CL.ts` |
| Tipos y punto de entrada (`import { reserva } from "@/i18n"`) | `src/i18n/index.ts` |
| Pruebas de estructura, tono, marca, paridad con el diseño y longitudes | `src/i18n/es-CL.test.ts` |
| Pruebas de las reglas de Meta y sincronía con el documento de plantillas | `src/i18n/whatsapp.test.ts` |
| Tono, ordlista, formato y reglas para escribir un texto nuevo | `docs/content/GUIA_DE_ESTILO.md` |
| Plantillas de WhatsApp listas para Meta (una sección por plantilla) | `docs/content/whatsapp-templates.md` |
| Plantillas de correo (respaldo de WhatsApp) | `docs/content/email-templates.md` |

Los nombres de los días de la semana y de los meses **no** están en
`src/i18n/`: viven en `src/lib/format/` (WP-04), para que el mismo nombre
("Vie", "vie", "oct") salga igual en servidor y cliente. `src/i18n/es-CL.ts`
solo recibe esos nombres ya formateados como parámetros de tipo `string`.

## Cómo se agrega un texto nuevo

1. Revisa si ya existe algo parecido en `es-CL.ts` (evita dos strings para lo
   mismo).
2. Si el texto ya está dibujado en `docs/design/reference/*.dc.html`,
   cópialo tal cual (mayúsculas, tildes, `·`, `−`, `ª`) y agrégalo a la tabla
   de paridad de diseño en `es-CL.test.ts`.
3. Si depende de datos reales, hazlo una función con **un** objeto de
   parámetros con nombre (ver `docs/content/GUIA_DE_ESTILO.md` §4).
4. Ponlo bajo el área que corresponda (`comun`, `nav`, `estados`, `errores`,
   `calendario`, `reserva`, `gestion`, `inicio`, `agenda`, `hoy`,
   `plantillasWhatsapp`, `whatsappSesion`, `email`) — nunca sueltos en la raíz
   del archivo.
5. Corre el texto por la lista negra de tono (usted, voseo, "po", "wena",
   anglicismos, emoji) y por el chequeo de marca (el nombre del producto nunca
   se escribe a mano fuera de `brand.ts`, se interpola `brand.name`).
6. Si es una plantilla de WhatsApp, actualiza `whatsapp-templates.md` en el
   mismo cambio: `whatsapp.test.ts` falla si el código y el documento no
   dicen exactamente lo mismo.

## Quién puede cambiar qué

- `copywriter-es-cl` es dueño de `src/i18n/` completo (incluye `index.ts` y
  las pruebas, no solo `es-CL.ts`: ver `docs/tasks/plans/WP-03.md` FRÅGA 10) y
  de `docs/content/`.
- Ningún componente escribe su propio texto (regla dura 6 de `CLAUDE.md`):
  `src/components/` y `src/app/**/page.tsx` (ui-engineer) reciben el texto
  como props, y `src/lib/format/` (scheduling-engineer, WP-04) solo entrega
  valores ya formateados.
- Los textos de consentimiento son un borrador (`consentimientos.version`,
  hoy `2026-10-v1`) y requieren revisión de un abogado antes del piloto
  (WP-27): ver `docs/legal/COMPLIANCE.md` y R8 en `docs/tasks/plans/WP-03.md`.
