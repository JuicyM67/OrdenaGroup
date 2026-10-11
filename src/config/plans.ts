// Planspärrar (WP-73, D-048): EN källa för vad varje plan får göra. Ren modul
// (ingen server-only) så att UI:t kan visa lås, men varje spärr kontrolleras
// på servern via `src/server/plans/entitlements.ts`. Ändra matrisen här —
// ingen annan kod ska jämföra planer med varandra.

export const BUSINESS_PLANS = [
  "free",
  "emprende",
  "equipo",
  "local",
  "custom",
] as const;
export type BusinessPlan = (typeof BUSINESS_PLANS)[number];

export function isBusinessPlan(v: unknown): v is BusinessPlan {
  return (
    typeof v === "string" && (BUSINESS_PLANS as readonly string[]).includes(v)
  );
}

export type Feature =
  /** Ta bort "Skapad med …"-märkningen på bokningssidan. */
  | "unbranded"
  /** Betalning vid bokning (Stripe Connect, bara SE). */
  | "online_payment"
  | "waitlist"
  | "flash"
  /** Utskick, "Vi saknar dig" och medlemsrabatter. */
  | "campaigns"
  /** Kassa & rapporter i sin helhet (annars enkel översikt). */
  | "full_reports"
  /** Personalkonton med behörigheter (D-034). */
  | "staff_accounts"
  /** Erbjudanden i marknadsplatsen (WP-70, D-056). */
  | "offers"
  | "priority_support";

export type LimitKind = "staff" | "services" | "sms";

/** Överstyrningar för `custom` (sätts av plattformsadmin, `businesses.custom_limits`). */
export type CustomLimits = { staff?: number; sms?: number };

const ALL_FEATURES: readonly Feature[] = [
  "unbranded",
  "online_payment",
  "waitlist",
  "flash",
  "campaigns",
  "full_reports",
  "staff_accounts",
  "offers",
  "priority_support",
];

const FEATURES: Record<BusinessPlan, ReadonlySet<Feature>> = {
  free: new Set<Feature>([]),
  emprende: new Set<Feature>(["unbranded", "online_payment", "waitlist"]),
  equipo: new Set<Feature>([
    "unbranded",
    "online_payment",
    "waitlist",
    "flash",
    "campaigns",
    "full_reports",
    "staff_accounts",
    "offers",
  ]),
  local: new Set<Feature>(ALL_FEATURES),
  custom: new Set<Feature>(ALL_FEATURES),
};

/** `null` = obegränsat. Konton räknas inklusive ägaren (D-037). */
const LIMITS: Record<BusinessPlan, Record<LimitKind, number | null>> = {
  free: { staff: 1, services: 3, sms: 0 },
  emprende: { staff: 1, services: null, sms: 50 },
  equipo: { staff: 3, services: null, sms: 150 },
  local: { staff: 10, services: null, sms: 300 },
  // Standard för `custom` tills admin avtalat annat (= Företag).
  custom: { staff: 10, services: null, sms: 300 },
};

/** Lägsta plan som har funktionen — för uppgraderingsrutan. */
export function minPlanFor(feature: Feature): BusinessPlan {
  const order: BusinessPlan[] = ["free", "emprende", "equipo", "local"];
  return order.find((p) => FEATURES[p].has(feature)) ?? "custom";
}

function normPlan(plan: string): BusinessPlan {
  return isBusinessPlan(plan) ? plan : "free";
}

export function can(plan: string, feature: Feature): boolean {
  return FEATURES[normPlan(plan)].has(feature);
}

export function limit(
  plan: string,
  kind: LimitKind,
  custom?: CustomLimits | null,
): number | null {
  const p = normPlan(plan);
  if (p === "custom" && custom && kind !== "services") {
    const v = custom[kind];
    if (typeof v === "number" && Number.isInteger(v) && v >= 0) return v;
  }
  return LIMITS[p][kind];
}

/** Läser `custom_limits` (jsonb) defensivt — okända nycklar ignoreras. */
export function parseCustomLimits(raw: unknown): CustomLimits {
  if (!raw || typeof raw !== "object") return {};
  const o = raw as Record<string, unknown>;
  const out: CustomLimits = {};
  for (const k of ["staff", "sms"] as const) {
    const v = o[k];
    if (typeof v === "number" && Number.isInteger(v) && v >= 0) out[k] = v;
  }
  return out;
}
