// Genererar de statiska Supabase Auth-mejlen (magic link + confirmación) för
// EN marknad — den aktuella installationens (`@/config/brand`, styrd av
// `NEXT_PUBLIC_MARKET`) — från SAMMA layout/innehåll som
// `src/server/messaging/email/` (regel hård 4/6: en källa till sanning för
// texten, `email.acceso.*` i i18n). Körs bara av ägaren/CI, aldrig mot
// produktion (regel hård 8) — det här skriptet skriver bara filer på disk,
// inget nätverksanrop.
//
// `brand`/`market` (`@/config/brand`) är fasta per process (D-025: en
// marknad per installation), så skriptet körs EN GÅNG PER MARKNAD, som två
// separata processer — annars skulle `brand.name` i mallarna (asunto,
// piePagina, ordmärket) inte stämma med den marknad som skrivs till disk.
//
// Kör (kräver `--conditions=react-server` så att `server-only` inte kastar
// utanför en bundlad React Server-kontext, samma trick som vitest.config.mts
// gör med en alias — här enklast som ett Node-resolveringsvillkor):
//
//   NODE_OPTIONS="--conditions=react-server" npx tsx scripts/render-auth-templates.ts
//   NEXT_PUBLIC_MARKET=SE NODE_OPTIONS="--conditions=react-server" npx tsx scripts/render-auth-templates.ts
//
// Skriver:
//   supabase/templates/es-CL/{magic_link,confirmation}.html + subjects.json
//   supabase/templates/sv-SE/{magic_link,confirmation}.html + subjects.json
//
// `supabase/config.toml` (bara lokal dev, alltid CL, se SUPABASE_CONFIG.md)
// pekar på `es-CL`-mapen. `scripts/setup-staging-env.sh` läser
// `subjects.json` för att sätta ämnet via Supabase Management API (staging,
// båda marknaderna).
import fs from "node:fs";
import path from "node:path";

import { brand, market, type Market } from "@/config/brand";
import { renderEmail } from "@/server/messaging/email/render";

const MARKET_DIR: Record<Market, string> = { CL: "es-CL", SE: "sv-SE" };

// D-019/WP-15: länken MÅSTE gå via /auth/confirm?token_hash=…&type=…, se
// motiveringen i src/server/messaging/email/templates/acceso.ts.
function confirmUrl(type: "magiclink" | "signup"): string {
  return `{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=${type}`;
}

const OUT_ROOT = path.resolve(
  import.meta.dirname,
  "..",
  "supabase",
  "templates",
);

const dir = path.join(OUT_ROOT, MARKET_DIR[market]);
fs.mkdirSync(dir, { recursive: true });

const magicLink = renderEmail("magicLink", market, {
  confirmUrl: confirmUrl("magiclink"),
  token: "{{ .Token }}",
});
const confirmation = renderEmail("confirmation", market, {
  confirmUrl: confirmUrl("signup"),
  token: "{{ .Token }}",
});

fs.writeFileSync(path.join(dir, "magic_link.html"), magicLink.html);
fs.writeFileSync(path.join(dir, "confirmation.html"), confirmation.html);
fs.writeFileSync(
  path.join(dir, "subjects.json"),
  JSON.stringify(
    { magic_link: magicLink.subject, confirmation: confirmation.subject },
    null,
    2,
  ) + "\n",
);

console.log(
  `${market} (${brand.name}) -> ${path.relative(process.cwd(), dir)}/`,
);
