/**
 * Punto de entrada de las traducciones. Ver `docs/content/README.md` y
 * `docs/content/GUIA_DE_ESTILO.md` para las reglas de estilo y de tipado.
 *
 * No importar nada de `src/lib/format/` ni de módulos de servidor: este
 * archivo debe poder usarse desde componentes cliente, Server Components,
 * route handlers y cron.
 */

/** Una hoja de texto: una cadena fija o una función con un solo parámetro
 * con nombre. `never` como tipo del parámetro permite que cualquier función
 * `(p: T) => string` (con T concreto) encaje aquí: nadie puede construir un
 * valor `never`, así que la asignación siempre es segura. */
export type Lov = string | ((p: never) => string);

/** Un árbol de traducciones: cada hoja es un `Lov`, cada rama es otro `Trad`. */
export type Trad = { readonly [k: string]: Lov | Trad };

// Språk per marknad (M2, D-025/D-026): `i18n-locale` pekar på es-CL.ts (tsconfig, vitest)
// och byts mot sv-SE.app.ts i SE-bygget (next.config.ts, turbopack.resolveAlias). Statisk
// `export *` så att bundlern fortsatt kan rensa bort oanvända texter.
export * from "i18n-locale";

export type Mensajes = typeof import("./es-CL");
