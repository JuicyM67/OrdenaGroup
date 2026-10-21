"use client";

// NewCampaignScreen — /app/clientes/utskick/nytt (WP-31, F14): formulario
// para enviar una campaña (nombre, audiencia, canal, mensaje, oferta
// opcional) con previsualización en vivo (`onPreview`, con debounce — mismo
// patrón 350 ms que la búsqueda de `CustomersScreen`) y confirmación antes
// de enviar (`ConfirmDialog`). Ningún *.dc.html de referencia (feature
// nueva) — reutiliza los componentes/tokens ya existentes.
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { useEffect, useRef, useState } from "react";

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
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { DateField } from "@/components/ui/date-field";
import { IconButton } from "@/components/ui/icon-button";
import { strokeArrow } from "@/components/ui/icons";
import { Pill } from "@/components/ui/pill";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { TextField } from "@/components/ui/text-field";
import { appHref } from "@/config/routes";
import { campanas } from "@/i18n";
import { addLocalDays, APP_TZ, toLocalDate } from "@/lib/format/dates";

import { campanaErrorText } from "./error-text";
import type {
  CampaignAudienceKind,
  CampaignInput,
  PreviewCampaignResult,
  SelectedCustomer,
  SendCampaignResult,
} from "./types";

export type NewCampaignScreenProps = {
  /** `?kunder=id,id` desde la ficha del cliente — ya resueltos a nombre por
   * el servidor (`getCustomerContact`). Presente = la audiencia por defecto
   * es "selected". */
  selectedCustomers?: SelectedCustomer[];
  /** `?audiencia=inactivos` desde Inicio ("Te echamos de menos"). */
  defaultAudience?: CampaignAudienceKind;
  canViewReports?: boolean;
  onLogout?: () => void | Promise<void>;
  onPreview: (input: CampaignInput) => Promise<PreviewCampaignResult>;
  onSend: (input: CampaignInput) => Promise<SendCampaignResult>;
  /** WP-57 punkt 7: `<OwnerPageHeader>` (klocka + profilmeny), samma data
   * som Inicio skickar till `AppShell` (`owner-chrome.tsx`). */
  ownerName: string;
  publicPageHref: string;
  myProfile?: MyProfileData;
  myProfileActions?: MyProfileActions;
};

const MESSAGE_MAX = 1000;
const DEFAULT_INACTIVE_DAYS = 60;

function audienceOptions(
  hasSelected: boolean,
): readonly CampaignAudienceKind[] {
  const base: CampaignAudienceKind[] = [
    "all",
    "members",
    "regulars",
    "inactive",
  ];
  return hasSelected ? [...base, "selected"] : base;
}

export function NewCampaignScreen({
  selectedCustomers,
  defaultAudience,
  canViewReports,
  onLogout,
  onPreview,
  onSend,
  ownerName,
  publicPageHref,
  myProfile,
  myProfileActions,
}: NewCampaignScreenProps) {
  const router = useRouter();
  const hasSelected = !!selectedCustomers && selectedCustomers.length > 0;

  const [name, setName] = useState("");
  const [audienceKind, setAudienceKind] = useState<CampaignAudienceKind>(
    () => defaultAudience ?? (hasSelected ? "selected" : "all"),
  );
  const [inactiveDays, setInactiveDays] = useState(
    String(DEFAULT_INACTIVE_DAYS),
  );
  const [message, setMessage] = useState("");
  const [offerEnabled, setOfferEnabled] = useState(false);
  const [offerPct, setOfferPct] = useState("");
  const [offerText, setOfferText] = useState("");
  // WP-60 fynd: `DateField` kräver alltid ett giltigt startvärde (dess eget
  // kontrakt, se date-field.tsx) — en tom sträng gav `monthOf("")` →
  // `{year: 0, month: 0}` → `formatLocalDate` kastade ("ogiltigt datum
  // 0000-00-01") så fort "Agregar un descuento" slogs på. En vecka framåt,
  // samma standard som andra förvalda datum i appen.
  const [offerValidUntil, setOfferValidUntil] = useState<string>(() =>
    addLocalDays(toLocalDate(new Date(), APP_TZ), 7),
  );

  const [preview, setPreview] = useState<PreviewCampaignResult | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const debounceRef = useRef<number | null>(null);
  const requestIdRef = useRef(0);

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [sendStatus, setSendStatus] = useState<"idle" | "sending" | "error">(
    "idle",
  );
  const [sendError, setSendError] = useState<string | null>(null);

  const messageMax = MESSAGE_MAX;

  function buildInput(): CampaignInput | null {
    const trimmedName = name.trim();
    const trimmedMessage = message.trim();
    if (!trimmedName || !trimmedMessage) return null;
    if (audienceKind === "inactive" && !inactiveDays) return null;
    const audience =
      audienceKind === "inactive"
        ? { kind: audienceKind, days: Number(inactiveDays) }
        : audienceKind === "selected"
          ? {
              kind: audienceKind,
              customerIds: (selectedCustomers ?? []).map((c) => c.id),
            }
          : { kind: audienceKind };
    if (audienceKind === "selected" && !hasSelected) return null;
    return {
      name: trimmedName,
      channel: "email",
      audience,
      message: trimmedMessage,
      offerPct: offerEnabled && offerPct ? Number(offerPct) : undefined,
      offerText:
        offerEnabled && offerText.trim() ? offerText.trim() : undefined,
      offerValidUntil:
        offerEnabled && offerValidUntil ? offerValidUntil : undefined,
    };
  }

  // Previsualización en vivo (debounce 350 ms, mismo patrón que la búsqueda
  // de `CustomersScreen`) — `requestIdRef` descarta una respuesta vieja si
  // el formulario cambió mientras tanto.
  useEffect(() => {
    const input = buildInput();
    if (debounceRef.current !== null) window.clearTimeout(debounceRef.current);
    if (!input) {
      // Inget setState synkront i effektkroppen (react-hooks/set-state-in-effect)
      // — nollställningen går via samma timer-väg som den riktiga hämtningen,
      // bara utan fördröjning.
      debounceRef.current = window.setTimeout(() => {
        setPreview(null);
        setPreviewLoading(false);
      }, 0);
      return () => {
        if (debounceRef.current !== null)
          window.clearTimeout(debounceRef.current);
      };
    }
    debounceRef.current = window.setTimeout(() => {
      // `setPreviewLoading(true)` flyttad hit (inte synkront i effektkroppen,
      // samma motiv som ovan) — visas precis innan hämtningen startar.
      setPreviewLoading(true);
      const requestId = ++requestIdRef.current;
      void onPreview(input).then((result) => {
        if (requestIdRef.current !== requestId) return;
        setPreview(result);
        setPreviewLoading(false);
      });
    }, 350);
    return () => {
      if (debounceRef.current !== null)
        window.clearTimeout(debounceRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    name,
    audienceKind,
    inactiveDays,
    message,
    offerEnabled,
    offerPct,
    offerText,
    offerValidUntil,
  ]);

  const recipients = preview?.ok ? preview.recipients : 0;
  // Espera a que la previsualización confirme al menos un destinatario — el
  // servidor igual rechaza (`no_recipients`), pero evita abrir la
  // confirmación para algo que ya sabemos que va a fallar.
  const canSend =
    buildInput() !== null && recipients > 0 && sendStatus !== "sending";

  async function handleConfirmSend() {
    const input = buildInput();
    if (!input) return;
    setSendStatus("sending");
    setSendError(null);
    const result = await onSend(input);
    if (result.ok) {
      setConfirmOpen(false);
      router.push(`${appHref("appClientesUtskick")}?enviado=1`);
      return;
    }
    setSendStatus("error");
    setSendError(campanaErrorText(result.code));
  }

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
            <IconButton
              label={campanas.nueva.volver}
              tone="ghost"
              size={36}
              asChild
            >
              <Link href={appHref("appClientesUtskick")}>
                <ArrowLeft
                  aria-hidden="true"
                  className="size-4.5"
                  strokeWidth={strokeArrow}
                />
              </Link>
            </IconButton>
            {campanas.nueva.titulo}
          </span>
        }
        subtitle={campanas.nueva.soloConsentimiento}
      />

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        <div className="flex flex-col gap-5 lg:col-span-2">
          <Card radius="tile" padding="lg" className="flex flex-col gap-4">
            <TextField
              label={campanas.nueva.nombreLabel}
              placeholder={campanas.nueva.nombrePlaceholder}
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={200}
              required
            />

            <div className="flex flex-col gap-2">
              <span className="text-13 font-semibold text-ink">
                {campanas.nueva.audienciaLabel}
              </span>
              <div className="flex flex-wrap gap-2">
                {audienceOptions(hasSelected).map((kind) => (
                  <Pill
                    key={kind}
                    selected={audienceKind === kind}
                    onClick={() => setAudienceKind(kind)}
                  >
                    {kind === "selected" && hasSelected
                      ? campanas.nueva.audienciaSeleccionadosResumen({
                          n: selectedCustomers.length,
                        })
                      : campanas.nueva.audiencia[kind]}
                  </Pill>
                ))}
              </div>
              {audienceKind === "inactive" ? (
                <TextField
                  label={campanas.nueva.audienciaInactivosDiasLabel}
                  type="number"
                  inputMode="numeric"
                  min={1}
                  max={730}
                  value={inactiveDays}
                  onChange={(e) => setInactiveDays(e.target.value)}
                  className="max-w-40"
                  required
                />
              ) : null}
              {audienceKind === "selected" && hasSelected ? (
                <div className="flex flex-wrap gap-1.5">
                  {selectedCustomers.map((c) => (
                    <Chip key={c.id} tone="neutral" size="sm">
                      {c.name}
                    </Chip>
                  ))}
                </div>
              ) : null}
            </div>

            <Textarea
              label={campanas.nueva.mensajeLabel}
              placeholder={campanas.nueva.mensajePlaceholder}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              maxLength={messageMax}
              rows={5}
              hint={campanas.nueva.contador({
                n: message.length,
                max: messageMax,
              })}
              required
            />
          </Card>

          <Card radius="tile" padding="lg" className="flex flex-col gap-4">
            <div className="flex items-center gap-3">
              <div className="min-w-0 flex-1">
                <p className="text-14 font-semibold text-ink">
                  {campanas.nueva.ofertaActivar}
                </p>
                <p className="mt-0.5 text-12 text-muted">
                  {campanas.nueva.ofertaActivarAyuda}
                </p>
              </div>
              <Switch
                checked={offerEnabled}
                onChange={setOfferEnabled}
                label={campanas.nueva.ofertaActivar}
              />
            </div>
            {offerEnabled ? (
              <>
                <TextField
                  label={campanas.nueva.ofertaPctLabel}
                  hint={campanas.nueva.ofertaPctAyuda}
                  type="number"
                  inputMode="numeric"
                  min={1}
                  max={100}
                  value={offerPct}
                  onChange={(e) => setOfferPct(e.target.value)}
                />
                <TextField
                  label={campanas.nueva.ofertaTextoLabel}
                  placeholder={campanas.nueva.ofertaTextoPlaceholder}
                  value={offerText}
                  onChange={(e) => setOfferText(e.target.value)}
                  maxLength={200}
                />
                <DateField
                  label={campanas.nueva.ofertaValidoHastaLabel}
                  value={offerValidUntil}
                  onChange={setOfferValidUntil}
                  className="max-w-56"
                />
              </>
            ) : null}
          </Card>
        </div>

        <div className="flex flex-col gap-5">
          <Card radius="tile" padding="lg" className="flex flex-col gap-3">
            <h2 className="text-15 font-bold text-ink">
              {campanas.nueva.previsualizacion.titulo}
            </h2>
            {previewLoading ? (
              <p className="text-13 text-muted">
                {campanas.nueva.previsualizacion.cargando}
              </p>
            ) : !preview ? (
              <p className="text-13 text-muted">
                {campanas.nueva.previsualizacion.vacio}
              </p>
            ) : preview.ok ? (
              <div className="flex flex-col gap-1.5 text-13">
                <span className="font-semibold text-ink">
                  {campanas.nueva.previsualizacion.destinatarios({
                    n: preview.recipients,
                  })}
                </span>
                {preview.skippedNoConsent > 0 ? (
                  <span className="text-muted">
                    {campanas.nueva.previsualizacion.sinConsentimiento({
                      n: preview.skippedNoConsent,
                    })}
                  </span>
                ) : null}
              </div>
            ) : (
              <p role="alert" className="text-13 text-ink">
                {campanaErrorText(preview.code)}
              </p>
            )}
          </Card>

          {sendError ? (
            <p role="alert" className="text-13 font-semibold text-ink">
              {sendError}
            </p>
          ) : null}

          <Button
            type="button"
            variant="primary"
            size="xl"
            disabled={!canSend}
            onClick={() => setConfirmOpen(true)}
          >
            {campanas.nueva.ctaEnviar}
          </Button>
        </div>
      </div>

      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={(open) => {
          if (sendStatus !== "sending") setConfirmOpen(open);
        }}
        title={campanas.nueva.confirmarTitulo}
        body={campanas.nueva.confirmarCuerpo({ n: recipients })}
        confirmLabel={
          sendStatus === "sending"
            ? campanas.nueva.enviando
            : campanas.nueva.confirmarSi
        }
        cancelLabel={campanas.nueva.confirmarNo}
        onConfirm={handleConfirmSend}
      />
    </AppShell>
  );
}
