"use client";

// OwnerReviewsScreen — /app/clientes/resenas (WP-65, D-045). Samma skal
// som CampaignsScreen (`AppShell`, pil tillbaka till Clientes, ingen egen
// post i MainNav). Filter som länkar (`?filtro=`), serverfiltrerat.
// Svara (ett offentligt svar, redigerbart) och anmäla (anledning) sker i
// en utfällbar panel per recension — ingen radering (D-045). Ingen
// *.dc.html-referens: befintliga tokens/komponenter (Card, Chip, Button,
// Textarea, Select).
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { AppShell } from "@/components/dashboard/app-shell";
import { MainNav } from "@/components/dashboard/main-nav";
import { OwnerMobileTabBar } from "@/components/mobile/owner-tab-bar";
import type {
  MyProfileActions,
  MyProfileData,
} from "@/components/shared/my-profile-dialog";
import { OwnerPageHeader } from "@/components/shared/owner-page-header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Chip } from "@/components/ui/chip";
import { cn } from "@/components/ui/cn";
import { IconButton } from "@/components/ui/icon-button";
import { strokeArrow } from "@/components/ui/icons";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { appHref } from "@/config/routes";
import { comun, resenas } from "@/i18n";
import { APP_TZ, formatDate, parseInstant } from "@/lib/format/dates";

import { formatAverage } from "./public-reviews";
import { Stars } from "./stars";

export type OwnerReviewFilterKey = "todas" | "sinResponder" | "bajas";

/** Speglar `OwnerReview` (`@/server/reviews/owner`) — ingen `@/server`-import
 * i en "use client"-fil. */
export type OwnerReviewItem = {
  id: string;
  rating: number;
  comment: string | null;
  displayName: string | null;
  servicio: string | null;
  createdAt: string;
  reply: string | null;
  reportedAt: string | null;
  hidden: boolean;
};

type Result = { ok: true } | { ok: false; code: string };

const REPORT_REASONS = [
  "offensive",
  "false",
  "personal_data",
  "not_customer",
  "other",
] as const;
type ReportReason = (typeof REPORT_REASONS)[number];

const t = resenas.panel;
const FILTERS: readonly OwnerReviewFilterKey[] = [
  "todas",
  "sinResponder",
  "bajas",
];

export type OwnerReviewsScreenProps = {
  filter: OwnerReviewFilterKey;
  average: number | null;
  count: number;
  unanswered: number;
  items: readonly OwnerReviewItem[];
  negocio: string;
  /** Ägaren eller `can_edit_settings` — annars bara läsning. */
  canManage: boolean;
  onReply: (reviewId: string, reply: string) => Promise<Result>;
  onReport: (
    reviewId: string,
    input: { reason: ReportReason; note: string },
  ) => Promise<Result>;
  canViewReports?: boolean;
  onLogout?: () => void | Promise<void>;
  ownerName: string;
  publicPageHref: string;
  myProfile?: MyProfileData;
  myProfileActions?: MyProfileActions;
};

function dateLabel(iso: string): string {
  const parsed = parseInstant(iso);
  return parsed.ok ? formatDate(parsed.value, APP_TZ, "dayMonthLong") : "";
}

function filterHref(f: OwnerReviewFilterKey): string {
  const base = appHref("appClientesResenas");
  return f === "todas" ? base : `${base}?filtro=${f}`;
}

export function OwnerReviewsScreen({
  filter,
  average,
  count,
  unanswered,
  items,
  negocio,
  canManage,
  onReply,
  onReport,
  canViewReports,
  onLogout,
  ownerName,
  publicPageHref,
  myProfile,
  myProfileActions,
}: OwnerReviewsScreenProps) {
  return (
    <AppShell
      rail={
        <MainNav
          active="clientes"
          onLogout={onLogout}
          canViewReports={canViewReports}
        />
      }
      mobileTabBar={
        <OwnerMobileTabBar
          active="clientes"
          className="lg:hidden"
          canViewReports={canViewReports}
        />
      }
      onLogout={onLogout}
      ownerName={ownerName}
      publicPageHref={publicPageHref}
      canViewReports={canViewReports}
      myProfile={myProfile}
      myProfileActions={myProfileActions}
      hideMobileTopBar
    >
      <OwnerPageHeader
        title={
          <span className="flex items-center gap-3">
            <IconButton label={comun.volver} tone="ghost" size={36} asChild>
              <Link href={appHref("appClientes")}>
                <ArrowLeft
                  aria-hidden="true"
                  className="size-4.5"
                  strokeWidth={strokeArrow}
                />
              </Link>
            </IconButton>
            {t.titulo}
          </span>
        }
      />

      {count > 0 && average !== null ? (
        <Card radius="tile" padding="lg" className="flex items-center gap-4">
          <span className="font-display text-40 font-bold text-ink">
            {formatAverage(average)}
          </span>
          <div className="flex flex-col gap-1">
            <Stars
              rating={average}
              label={resenas.publico.notaAria({
                nota: formatAverage(average),
                n: count,
              })}
              size="md"
            />
            <span className="text-13 text-muted">
              {resenas.publico.cantidad({ n: count })}
              {unanswered > 0
                ? ` · ${t.filtros.sinResponder}: ${unanswered}`
                : ""}
            </span>
          </div>
        </Card>
      ) : null}

      <nav aria-label={t.filtrosLabel} className="flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <Link
            key={f}
            href={filterHref(f)}
            aria-current={filter === f ? "page" : undefined}
            className={cn(
              "flex h-10 items-center rounded-full px-4 text-14 font-semibold transition-colors duration-150 ease-out focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink focus-visible:transition-none",
              filter === f ? "bg-ink text-on-dark" : "bg-surface text-ink",
            )}
          >
            {t.filtros[f]}
          </Link>
        ))}
      </nav>

      {items.length === 0 ? (
        <Card radius="tile" padding="lg" className="text-14 text-muted">
          {count === 0 ? t.vacio : t.vacioFiltro}
        </Card>
      ) : (
        <ul className="flex flex-col gap-2.5">
          {items.map((r) => (
            <li key={r.id}>
              <ReviewCard
                review={r}
                negocio={negocio}
                canManage={canManage}
                onReply={onReply}
                onReport={onReport}
              />
            </li>
          ))}
        </ul>
      )}
    </AppShell>
  );
}

function ReviewCard({
  review: r,
  negocio,
  canManage,
  onReply,
  onReport,
}: {
  review: OwnerReviewItem;
  negocio: string;
  canManage: boolean;
  onReply: OwnerReviewsScreenProps["onReply"];
  onReport: OwnerReviewsScreenProps["onReport"];
}) {
  const router = useRouter();
  const [panel, setPanel] = useState<"none" | "reply" | "report">("none");
  const [reply, setReply] = useState(r.reply ?? "");
  const [reason, setReason] = useState<ReportReason>("offensive");
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(false);

  async function run(fn: () => Promise<Result>) {
    setSaving(true);
    setError(false);
    try {
      const result = await fn();
      if (result.ok) {
        setPanel("none");
        router.refresh();
      } else {
        setError(true);
      }
    } catch {
      setError(true);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      className={cn(
        "flex flex-col gap-2 rounded-tile bg-surface px-5.5 py-4",
        r.hidden && "opacity-60",
      )}
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="text-15 font-bold text-ink">
            {r.displayName ?? resenas.publico.anonimo}
          </span>
          <Stars
            rating={r.rating}
            label={resenas.publico.estrellasAria({ n: r.rating })}
          />
        </div>
        <div className="flex items-center gap-2">
          {r.hidden ? (
            <Chip tone="neutral" size="xs">
              {t.oculta}
            </Chip>
          ) : r.reportedAt ? (
            <Chip tone="pending" size="xs">
              {t.reportada}
            </Chip>
          ) : null}
          <span className="text-12 text-muted">{dateLabel(r.createdAt)}</span>
        </div>
      </div>
      {r.servicio ? (
        <span className="text-12 text-muted">{r.servicio}</span>
      ) : null}
      <p className="text-14 leading-relaxed whitespace-pre-line text-ink-soft">
        {r.comment ?? t.sinComentario}
      </p>

      {r.reply && panel !== "reply" ? (
        <div className="rounded-control bg-canvas px-4 py-3">
          <p className="text-12 font-bold text-ink">
            {resenas.publico.respuesta({ negocio })}
          </p>
          <p className="mt-1 text-13 leading-relaxed whitespace-pre-line text-ink-soft">
            {r.reply}
          </p>
        </div>
      ) : null}

      {canManage && panel === "none" ? (
        <div className="flex flex-wrap gap-2 pt-1">
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={() => setPanel("reply")}
          >
            {r.reply ? t.editarRespuesta : t.responder}
          </Button>
          {!r.reportedAt && !r.hidden ? (
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => setPanel("report")}
            >
              {t.reportar}
            </Button>
          ) : null}
        </div>
      ) : null}

      {panel === "reply" ? (
        <form
          className="flex flex-col gap-3 pt-1"
          onSubmit={(e) => {
            e.preventDefault();
            void run(() => onReply(r.id, reply));
          }}
        >
          <Textarea
            label={t.respuestaLabel}
            hint={t.respuestaAyuda}
            value={reply}
            maxLength={1000}
            rows={3}
            onChange={(e) => setReply(e.target.value)}
          />
          <PanelButtons
            saving={saving}
            error={error}
            submitLabel={t.publicarRespuesta}
            onCancel={() => {
              setReply(r.reply ?? "");
              setPanel("none");
            }}
          />
        </form>
      ) : null}

      {panel === "report" ? (
        <form
          className="flex flex-col gap-3 pt-1"
          onSubmit={(e) => {
            e.preventDefault();
            void run(() => onReport(r.id, { reason, note }));
          }}
        >
          <p className="text-15 font-bold text-ink">{t.reportarTitulo}</p>
          <p className="text-13 text-muted">{t.reportarTexto}</p>
          <Select
            label={t.motivoLabel}
            value={reason}
            onChange={(e) => setReason(e.target.value as ReportReason)}
          >
            {REPORT_REASONS.map((x) => (
              <option key={x} value={x}>
                {t.motivos[x]}
              </option>
            ))}
          </Select>
          <Textarea
            label={t.detalleLabel}
            value={note}
            maxLength={500}
            rows={2}
            onChange={(e) => setNote(e.target.value)}
          />
          <PanelButtons
            saving={saving}
            error={error}
            submitLabel={t.enviarReporte}
            onCancel={() => setPanel("none")}
          />
        </form>
      ) : null}
    </div>
  );
}

function PanelButtons({
  saving,
  error,
  submitLabel,
  onCancel,
}: {
  saving: boolean;
  error: boolean;
  submitLabel: string;
  onCancel: () => void;
}) {
  return (
    <>
      {error ? (
        <p role="alert" className="text-13 text-alert-fg">
          {t.error}
        </p>
      ) : null}
      <div className="flex flex-wrap gap-2">
        <Button type="submit" size="sm" disabled={saving}>
          {submitLabel}
        </Button>
        <Button type="button" variant="secondary" size="sm" onClick={onCancel}>
          {t.cancelar}
        </Button>
      </div>
    </>
  );
}
