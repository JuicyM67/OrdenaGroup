import "server-only";

/**
 * WP-66 (D-046): bokningsplattformar som AI-importen får läsa från. Det är
 * Anthropics web fetch-verktyg som hämtar sidan (`allowed_domains` = den här
 * listan), aldrig vår server — ingen SSRF. Listan valideras ändå här först så
 * att en okänd domän ger ett tydligt fel utan att ett API-anrop görs.
 *
 * Lägg till en plattform: en rad till. `domains` täcker även underdomäner
 * (www., m., landsspecifika) — samma semantik som `allowed_domains`.
 */
import { z } from "zod";

export type ImportPlatform = {
  /** Kort nyckel, loggas i `ai_import_runs.platform` (aldrig URL:en). */
  key: string;
  name: string;
  domains: readonly string[];
  /** Var plattformen är vanlig — styr bara listan som visas för ägaren. */
  markets: readonly ("CL" | "SE")[];
};

export const IMPORT_PLATFORMS: readonly ImportPlatform[] = [
  {
    key: "bokadirekt",
    name: "Bokadirekt",
    domains: ["bokadirekt.se"],
    markets: ["SE"],
  },
  {
    key: "fresha",
    name: "Fresha",
    domains: ["fresha.com"],
    markets: ["SE", "CL"],
  },
  {
    key: "booksy",
    name: "Booksy",
    domains: ["booksy.com", "booksy.net"],
    markets: ["SE", "CL"],
  },
  {
    key: "timma",
    name: "Timma",
    domains: ["timma.se", "timma.fi"],
    markets: ["SE"],
  },
  {
    key: "agendapro",
    name: "AgendaPro",
    domains: ["agendapro.com", "agendapro.cl"],
    markets: ["CL"],
  },
  {
    key: "reservo",
    name: "Reservo",
    domains: ["reservo.cl"],
    markets: ["CL"],
  },
  {
    key: "treatwell",
    name: "Treatwell",
    domains: ["treatwell.se", "treatwell.com", "treatwell.co.uk"],
    markets: ["SE"],
  },
];

/** Alla domäner, i den form `allowed_domains` vill ha (värdnamn utan schema). */
export const IMPORT_ALLOWED_DOMAINS: readonly string[] =
  IMPORT_PLATFORMS.flatMap((p) => p.domains);

/** "Bokadirekt, Timma, …" för ägarens marknad (visas under länkfältet). */
export function platformNamesFor(market: "CL" | "SE"): string {
  return IMPORT_PLATFORMS.filter((p) => p.markets.includes(market))
    .map((p) => p.name)
    .join(", ");
}

export function platformForHost(host: string): ImportPlatform | null {
  const h = host.toLowerCase().replace(/\.$/, "");
  return (
    IMPORT_PLATFORMS.find((p) =>
      p.domains.some((d) => h === d || h.endsWith(`.${d}`)),
    ) ?? null
  );
}

export type ParsedImportUrl = { url: string; platform: ImportPlatform };

/**
 * Felkoder: `import.url_invalid` (inte en https-länk) och
 * `import.platform_unsupported` (giltig länk, men okänd plattform → UI:t
 * erbjuder "klistra in texten" i stället).
 */
export const importUrlSchema = z
  .string({ error: "import.url_invalid" })
  .trim()
  .min(1, { error: "import.url_invalid" })
  .max(2000, { error: "import.url_invalid" })
  .transform((raw, ctx): ParsedImportUrl => {
    // Ägare klistrar ofta in utan schema ("bokadirekt.se/places/…").
    const withScheme = /^[a-z][a-z0-9+.-]*:\/\//i.test(raw)
      ? raw
      : `https://${raw}`;
    let u: URL;
    try {
      u = new URL(withScheme);
    } catch {
      ctx.issues.push({
        code: "custom",
        message: "import.url_invalid",
        input: raw,
      });
      return z.NEVER;
    }
    if (u.protocol !== "https:" || u.username || u.password || u.port) {
      ctx.issues.push({
        code: "custom",
        message: "import.url_invalid",
        input: raw,
      });
      return z.NEVER;
    }
    const platform = platformForHost(u.hostname);
    if (!platform) {
      ctx.issues.push({
        code: "custom",
        message: "import.platform_unsupported",
        input: raw,
      });
      return z.NEVER;
    }
    u.hash = "";
    return { url: u.toString(), platform };
  });
