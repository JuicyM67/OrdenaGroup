// WP-78 (D-059): Plan-flikens abonnemangsvy ur `BillingOverview` (ren
// funktion: används av sidan och av design lab-fixturerna). Alla texter och
// datum formateras här, på servern.
import type {
  BillingStatusView,
  PlanBillingData,
  PlanCardItem,
} from "@/components/settings/plan-billing-section";
import { formatPrecioPlan, precioPlan } from "@/config/pricing";
import { planes, suscripcion } from "@/i18n";
import { APP_TZ, formatLocalDate, toLocalDate } from "@/lib/format/dates";
import { formatSek } from "@/lib/format/money";
import { PAID_PLANS, type PaidPlan } from "@/lib/validation/billing";
import { TRIAL_DAYS } from "@/server/billing/subscriptions/config";
import type { BillingOverview } from "@/server/billing/subscriptions/status";

const ab = suscripcion;
const LIVE = new Set(["trialing", "active", "past_due", "incomplete"]);

function shortDate(iso: string | null): string {
  return iso
    ? formatLocalDate(toLocalDate(new Date(iso), APP_TZ), "dayMonthLong")
    : "";
}

function brandName(b: string): string {
  const m = ab.marcas as Record<string, string>;
  return m[b] ?? ab.marcas.otra;
}

export function buildBillingView(
  ov: BillingOverview,
  upcoming: number | null,
  ret: PlanBillingData["returnState"] | "done",
  now: Date = new Date(),
): PlanBillingData {
  const sub = ov.subscription;
  const live = sub !== null && LIVE.has(sub.status);
  const custom = ov.businessPlan === "custom";
  const name = (p: string) =>
    (planes.nombres as Record<string, string>)[p] ?? p;

  let chip: BillingStatusView["chip"] = {
    label: ab.estado.activo,
    tone: "neutral",
  };
  const lines: string[] = [];
  let warning: string | null = null;
  if (custom) {
    chip = { label: ab.estado.activo, tone: "success" };
  } else if (sub && live) {
    const end = sub.status === "trialing" ? sub.trialEnd : sub.periodEnd;
    if (sub.status === "past_due") {
      chip = { label: ab.estado.fallido, tone: "alert" };
      warning = ab.fallidoTexto({
        plan: name(sub.plan),
        fecha: shortDate(sub.graceUntil),
      });
    } else if (sub.status === "incomplete") {
      chip = { label: ab.estado.pendiente, tone: "pending" };
    } else if (sub.cancelAtPeriodEnd) {
      chip = {
        label: ab.estado.termina({ fecha: shortDate(end) }),
        tone: "pending",
      };
      lines.push(
        ab.terminaTexto({ plan: name(sub.plan), fecha: shortDate(end) }),
      );
    } else if (sub.status === "trialing") {
      chip = {
        label: ab.estado.prueba({ fecha: shortDate(end) }),
        tone: "pending",
      };
      const days = end
        ? Math.max(
            1,
            Math.ceil((new Date(end).getTime() - now.getTime()) / 86_400_000),
          )
        : TRIAL_DAYS;
      lines.push(ab.diasPrueba({ n: days }));
      if (!sub.card) {
        warning = ab.pruebaSinTarjeta({
          fecha: shortDate(end),
          plan: name(sub.plan),
        });
      }
    } else {
      chip = { label: ab.estado.activo, tone: "success" };
    }
    if (
      !sub.cancelAtPeriodEnd &&
      sub.status !== "past_due" &&
      (sub.status === "active" || sub.card)
    ) {
      lines.push(
        upcoming !== null
          ? ab.proximaFactura({
              monto: `${formatSek(upcoming)} ${ab.ivaIncluido}`,
              fecha: shortDate(end),
            })
          : ab.proximaFacturaSinMonto({ fecha: shortDate(end) }),
      );
    }
    if (sub.pendingPlan && !sub.cancelAtPeriodEnd) {
      lines.push(
        ab.cambioPendiente({
          plan: name(sub.pendingPlan),
          fecha: shortDate(sub.periodEnd),
        }),
      );
    }
  } else if (ov.overrideUntil) {
    chip = {
      label: ab.estado.piloto({ fecha: shortDate(ov.overrideUntil) }),
      tone: "pending",
    };
    warning = ab.pilotoTexto({ fecha: shortDate(ov.overrideUntil) });
  } else {
    lines.push(
      ov.trialAvailable
        ? ab.gratisTexto({ n: TRIAL_DAYS })
        : ab.gratisSinPrueba,
    );
  }

  const trialNoCard = sub?.status === "trialing" && !sub.card;
  const status: BillingStatusView = {
    planName: name(ov.businessPlan),
    chip,
    lines,
    warning,
    card: sub?.card
      ? ab.tarjeta({
          marca: brandName(sub.card.brand),
          ultimos: sub.card.last4,
        })
      : null,
    portalLabel: ov.hasCustomer
      ? trialNoCard
        ? ab.botones.agregarTarjeta
        : sub?.status === "past_due"
          ? ab.banner.cta
          : ab.botones.gestionar
      : null,
    canCancel:
      !custom && live && !sub.cancelAtPeriodEnd && sub.status !== "incomplete",
    canResume: !custom && live && sub.cancelAtPeriodEnd,
    cancelDate: shortDate(
      sub?.status === "trialing" ? sub.trialEnd : (sub?.periodEnd ?? null),
    ),
  };

  const plans: PlanCardItem[] = [
    {
      id: "free",
      name: name("free"),
      price: formatPrecioPlan("gratis"),
      current: !live && ov.businessPlan === "free",
      action: live && !sub.cancelAtPeriodEnd ? "cancel" : "none",
    },
    ...PAID_PLANS.map((p): PlanCardItem => {
      const current =
        live && sub.plan === p && !sub.pendingPlan && !sub.cancelAtPeriodEnd;
      return {
        id: p,
        name: name(p),
        price: formatPrecioPlan(p),
        current,
        action: current
          ? "none"
          : !live
            ? "start"
            : sub.status === "past_due" || sub.status === "incomplete"
              ? "none"
              : "change",
      };
    }),
  ];

  const monthlyTotals = Object.fromEntries(
    PAID_PLANS.map((p) => {
      const net = precioPlan(p, "SE");
      return [p, formatSek(net + Math.round(net / 4))];
    }),
  ) as Record<PaidPlan, string>;

  return {
    status,
    plans,
    custom,
    trialDays: TRIAL_DAYS,
    trialAvailable: ov.trialAvailable,
    monthlyTotals,
    returnState:
      ret === "done" ? { kind: "done", planName: name(ov.businessPlan) } : ret,
  };
}
