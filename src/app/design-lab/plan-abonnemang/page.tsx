// WP-78 (D-059): design lab för abonnemangets del av Inställningar → Plan,
// med fasta fixturer i fyra lägen (`?state=gratis|prov|aktiv|misslyckad`).
// Samma vy-funktion som den riktiga sidan (`buildBillingView`); knapparna gör
// ingenting här (server actions som svarar "inte tillgängligt").
import { buildBillingView } from "@/app/(app)/app/ajustes/plan/billing-view";
import { AjustesShell } from "@/components/settings/ajustes-shell";
import { buildAjustesTabs } from "@/components/settings/ajustes-tabs";
import { PlanBillingSection } from "@/components/settings/plan-billing-section";
import { PlanSection } from "@/components/settings/plan-section";
import type { BillingActionResult } from "@/lib/validation/billing";
import type { BillingOverview } from "@/server/billing/subscriptions/status";

const NOW = new Date("2026-10-11T10:00:00Z");
const day = (n: number) =>
  new Date(NOW.getTime() + n * 86_400_000).toISOString();

type State = "gratis" | "prov" | "aktiv" | "misslyckad";

const FIXTURES: Record<
  State,
  { ov: BillingOverview; upcoming: number | null }
> = {
  gratis: {
    ov: {
      available: true,
      businessPlan: "free",
      overrideUntil: null,
      subscription: null,
      trialAvailable: true,
      hasCustomer: false,
    },
    upcoming: null,
  },
  prov: {
    ov: {
      available: true,
      businessPlan: "equipo",
      overrideUntil: null,
      subscription: {
        plan: "equipo",
        status: "trialing",
        trialEnd: day(9),
        periodEnd: day(9),
        cancelAtPeriodEnd: false,
        pendingPlan: null,
        graceUntil: null,
        card: null,
      },
      trialAvailable: false,
      hasCustomer: true,
    },
    upcoming: null,
  },
  aktiv: {
    ov: {
      available: true,
      businessPlan: "equipo",
      overrideUntil: null,
      subscription: {
        plan: "equipo",
        status: "active",
        trialEnd: null,
        periodEnd: day(21),
        cancelAtPeriodEnd: false,
        pendingPlan: null,
        graceUntil: null,
        card: { brand: "visa", last4: "4242" },
      },
      trialAvailable: false,
      hasCustomer: true,
    },
    upcoming: 62_375,
  },
  misslyckad: {
    ov: {
      available: true,
      businessPlan: "equipo",
      overrideUntil: null,
      subscription: {
        plan: "equipo",
        status: "past_due",
        trialEnd: null,
        periodEnd: day(28),
        cancelAtPeriodEnd: false,
        pendingPlan: null,
        graceUntil: day(12),
        card: { brand: "mastercard", last4: "0341" },
      },
      trialAvailable: false,
      hasCustomer: true,
    },
    upcoming: null,
  },
};

async function unavailable(): Promise<BillingActionResult> {
  "use server";
  return { ok: false, code: "billing_unavailable" };
}

async function previewUnavailable(): Promise<{ ok: false; code: string }> {
  "use server";
  return { ok: false, code: "billing_unavailable" };
}

const PLAN_LIMITS = {
  free: { staff: 1, services: 3, sms: 0 },
  equipo: { staff: 3, services: null, sms: 150 },
} as const;

export default async function DesignLabPlanAbonnemang({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const state: State =
    sp.state === "prov" || sp.state === "aktiv" || sp.state === "misslyckad"
      ? sp.state
      : "gratis";
  const f = FIXTURES[state];
  const data = buildBillingView(f.ov, f.upcoming, null, NOW);
  const plan = f.ov.businessPlan === "free" ? "free" : "equipo";
  const lim = PLAN_LIMITS[plan];
  return (
    <AjustesShell
      active="plan"
      tabs={buildAjustesTabs({
        role: "owner",
        perms: {
          can_edit_settings: true,
          can_edit_catalog: true,
          can_manage_team: true,
        },
      })}
      business={{ slug: "salong-norrsken", name: "Salong Norrsken" }}
      owner={{ name: "Camila Rivas" }}
    >
      <PlanBillingSection
        data={data}
        actions={{
          onStart: unavailable,
          onPreview: previewUnavailable,
          onChange: unavailable,
          onCancel: unavailable,
          onResume: unavailable,
          onPortal: unavailable,
        }}
      />
      <PlanSection
        data={{
          plan,
          staff: { used: 1, limit: lim.staff },
          services: { used: 3, limit: lim.services },
          sms: { used: 0, limit: lim.sms },
        }}
        hideChangeCard
      />
    </AjustesShell>
  );
}
