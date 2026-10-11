"use client";

// Redigeraren för ett erbjudande (WP-70, D-056) — högerkolumnen i `/app/erbjudanden`,
// samma formspråk som Inställningar → Tjänster (`ServiceForm`: bg-canvas-panel, TextField/
// Select/Textarea, Spara/Avbryt). Servern bestämmer allt (pris, plan, vem som publicerar);
// klientens kontroller är bara för snabbare fel.
//
// Förhandsvisningen är samma kort som i Upptäck (`OfferCard`), byggt ur formuläret och
// inte klickbart (`inert`). "Förhandsvisa" öppnar den publika sidan för ett publicerat
// erbjudande.
import { ExternalLink, Plus, X } from "lucide-react";
import { useRef, useState } from "react";

import { OfferCard } from "@/components/marketplace/offer-card";
import { Button } from "@/components/ui/button";
import { Chip } from "@/components/ui/chip";
import { DateField } from "@/components/ui/date-field";
import { IconButton } from "@/components/ui/icon-button";
import { Select } from "@/components/ui/select";
import { TextField } from "@/components/ui/text-field";
import { Textarea } from "@/components/ui/textarea";
import type { MarketplaceCategoryId } from "@/config/marketplace";
import { hrefMarketplace } from "@/config/routes";
import { descubre, ofertas } from "@/i18n";
import { APP_TZ, toLocalDate } from "@/lib/format/dates";
import { formatMoney, moneyInputValue, parseMoney } from "@/lib/format/money";
import {
  OFFER_CATEGORY_IDS,
  OFFER_IMAGE_CONTENT_TYPES,
  OFFER_INCLUDES_MAX,
  OFFER_INCLUDE_ITEM_MAX,
  OFFER_TEXT_MAX,
  OFFER_TITLE_MAX,
  OFFER_VALID_MONTHS,
  offerDiscountPct,
} from "@/lib/validation/offers";

import { uploadOfferImage } from "./upload-offer-image";
import type {
  EditorOffer,
  EditorService,
  OfferStatus,
  OffersActions,
} from "./types";

const t = ofertas.editor;

type Form = {
  serviceId: string;
  title: string;
  description: string;
  includes: string[];
  terms: string;
  category: string;
  offerPrice: string;
  quantity: string;
  saleStartsOn: string | null;
  saleEndsOn: string | null;
  validMonths: number;
};

type Field =
  | "serviceId"
  | "title"
  | "includes"
  | "offerPrice"
  | "quantity"
  | "saleEndsOn"
  | "image"
  | "general";

function fieldFor(code: string): Field {
  if (code === "offers.service_required") return "serviceId";
  if (code.startsWith("offers.title")) return "title";
  if (code.startsWith("offers.include")) return "includes";
  if (code.startsWith("offers.price")) return "offerPrice";
  if (code.startsWith("offers.quantity")) return "quantity";
  if (code === "offers.date_invalid" || code === "offers.sale_window_invalid") {
    return "saleEndsOn";
  }
  if (code.startsWith("offers.image") || code === "offers.upload_failed") {
    return "image";
  }
  return "general";
}

export function offerErrorText(code: string): string {
  const errores = ofertas.errores as Readonly<Record<string, string>>;
  return errores[code] ?? ofertas.errores.desconocido;
}

function toForm(
  offer: EditorOffer | null,
  services: readonly EditorService[],
  defaultCategory: string,
): Form {
  if (!offer) {
    return {
      serviceId: services[0]?.id ?? "",
      title: "",
      description: "",
      includes: [""],
      terms: "",
      category: defaultCategory,
      offerPrice: "",
      quantity: "",
      saleStartsOn: null,
      saleEndsOn: null,
      validMonths: 12,
    };
  }
  return {
    serviceId: offer.serviceId,
    title: offer.title,
    description: offer.description,
    includes: offer.includes.length > 0 ? [...offer.includes] : [""],
    terms: offer.terms,
    category: offer.category,
    offerPrice: moneyInputValue(offer.offerPriceMinor),
    quantity: offer.quantityTotal === null ? "" : String(offer.quantityTotal),
    saleStartsOn: offer.saleStartsOn,
    saleEndsOn: offer.saleEndsOn,
    validMonths: offer.validMonths,
  };
}

const STATUS_TONE: Record<
  OfferStatus,
  "success" | "lavender" | "pending" | "dark"
> = {
  published: "success",
  draft: "lavender",
  paused: "pending",
  ended: "dark",
};

export function OfferStatusChip({ status }: { status: OfferStatus }) {
  return (
    <Chip tone={STATUS_TONE[status]} size="sm" weight="bold">
      {ofertas.estado[status]}
    </Chip>
  );
}

function OptionalDate({
  label,
  value,
  onChange,
  error,
}: {
  label: string;
  value: string | null;
  onChange: (v: string | null) => void;
  error?: string;
}) {
  if (value === null) {
    return (
      <div className="flex flex-col gap-1.5">
        <span className="text-13 font-semibold text-ink">{label}</span>
        <Button
          type="button"
          variant="secondary"
          size="sm"
          className="justify-start"
          onClick={() => onChange(toLocalDate(new Date(), APP_TZ))}
        >
          <Plus aria-hidden="true" className="size-4" />
          {label}
        </Button>
        {error ? <span className="text-13 text-alert">{error}</span> : null}
      </div>
    );
  }
  return (
    <div className="flex flex-col gap-1">
      <DateField
        label={label}
        value={value}
        onChange={onChange}
        error={error}
      />
      <button
        type="button"
        className="w-fit text-13 font-semibold text-muted underline-offset-2 hover:underline"
        onClick={() => onChange(null)}
      >
        {t.limpiar}
      </button>
    </div>
  );
}

export function OfferEditor({
  offer,
  services,
  defaultCategory,
  business,
  canPublish,
  actions,
  onSaved,
  onClose,
}: {
  offer: EditorOffer | null;
  services: readonly EditorService[];
  defaultCategory: string;
  business: { name: string; slug: string; areaName: string | null };
  canPublish: boolean;
  actions: OffersActions;
  /** Efter spara/publicera/pausa: id:t (nytt eller befintligt) och ny status. */
  onSaved: (id: string) => void;
  onClose: () => void;
}) {
  const [offerId, setOfferId] = useState<string | null>(offer?.id ?? null);
  const [status, setStatus] = useState<OfferStatus>(offer?.status ?? "draft");
  const [form, setForm] = useState<Form>(() =>
    toForm(offer, services, defaultCategory),
  );
  /** `undefined` = oförändrad, `null` = borttagen, sträng = ny uppladdning. */
  const [imagePath, setImagePath] = useState<string | null | undefined>();
  const [imagePreview, setImagePreview] = useState<string | null>(
    offer?.imageUrl ?? null,
  );
  const [errors, setErrors] = useState<Partial<Record<Field, string>>>({});
  const [busy, setBusy] = useState<"save" | "status" | "upload" | null>(null);
  const [saved, setSaved] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const service = services.find((s) => s.id === form.serviceId);
  const parsedPrice = parseMoney(form.offerPrice);
  const priceMinor = parsedPrice.ok ? parsedPrice.value : 0;
  const pct = service ? offerDiscountPct(service.lowestMinor, priceMinor) : 0;
  const lockedForMe = status === "published" && !canPublish;
  const slug = offer?.slug ?? null;

  function update(patch: Partial<Form>) {
    setForm((f) => ({ ...f, ...patch }));
    setSaved(false);
  }

  function showError(code: string) {
    setErrors({ [fieldFor(code)]: offerErrorText(code) });
  }

  async function save(): Promise<string | null> {
    setErrors({});
    const quantity = form.quantity.trim();
    const quantityTotal = quantity === "" ? null : Number(quantity);
    if (
      quantityTotal !== null &&
      (!Number.isInteger(quantityTotal) || quantityTotal < 1)
    ) {
      showError("offers.quantity_invalid");
      return null;
    }
    const result = await actions.save(offerId, {
      serviceId: form.serviceId,
      title: form.title,
      description: form.description,
      includes: form.includes,
      terms: form.terms,
      category: form.category,
      offerPrice: form.offerPrice,
      quantityTotal,
      saleStartsOn: form.saleStartsOn,
      saleEndsOn: form.saleEndsOn,
      validMonths: form.validMonths,
      imagePath,
    });
    if (!result.ok) {
      showError(result.code);
      return null;
    }
    setOfferId(result.id);
    setImagePath(undefined);
    return result.id;
  }

  async function onSave() {
    setBusy("save");
    try {
      const id = await save();
      if (id) {
        setSaved(true);
        onSaved(id);
      }
    } finally {
      setBusy(null);
    }
  }

  async function onStatus(next: "published" | "paused") {
    setBusy("status");
    try {
      // Publicera sparar först, så att det som publiceras är det som syns här.
      const id = next === "published" ? await save() : offerId;
      if (!id) return;
      const result = await actions.setStatus(id, next);
      if (!result.ok) {
        showError(result.code);
        return;
      }
      setStatus(next);
      setSaved(false);
      onSaved(id);
    } finally {
      setBusy(null);
    }
  }

  async function onFile(file: File | undefined) {
    if (!file) return;
    setBusy("upload");
    setErrors({});
    try {
      const r = await uploadOfferImage(file, actions.createImageUpload);
      if ("code" in r) {
        showError(r.code);
        return;
      }
      setImagePath(r.path);
      setImagePreview((prev) => {
        if (prev?.startsWith("blob:")) URL.revokeObjectURL(prev);
        return URL.createObjectURL(file);
      });
      setSaved(false);
    } finally {
      setBusy(null);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  const includes = form.includes;

  return (
    <div
      data-testid="offer-editor"
      className="flex flex-col gap-4 rounded-tile bg-surface p-5 fields-on-surface"
    >
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-18 font-bold text-ink">
          {offerId ? t.tituloEditar : t.tituloNueva}
        </h2>
        {offerId ? <OfferStatusChip status={status} /> : null}
      </div>

      {lockedForMe ? (
        <p
          role="note"
          className="rounded-tile bg-canvas p-3 text-13 text-muted"
        >
          {t.publicadaSoloDueno}
        </p>
      ) : null}

      <fieldset disabled={lockedForMe} className="flex flex-col gap-4">
        {/* Bild */}
        <div className="flex flex-col gap-2">
          <span className="text-13 font-semibold text-ink">{t.imagen}</span>
          {imagePreview ? (
            // eslint-disable-next-line @next/next/no-img-element -- förhandsvisning i redigeraren (blob: eller vår bucket).
            <img
              src={imagePreview}
              alt=""
              className="h-44 w-full rounded-tile object-cover"
            />
          ) : (
            <div
              aria-hidden="true"
              className="h-44 w-full rounded-tile bg-lavender"
            />
          )}
          <div className="flex flex-wrap items-center gap-2">
            <input
              ref={fileRef}
              type="file"
              accept={OFFER_IMAGE_CONTENT_TYPES.join(",")}
              className="sr-only"
              tabIndex={-1}
              aria-label={t.subirImagen}
              onChange={(e) => void onFile(e.target.files?.[0])}
            />
            <Button
              type="button"
              variant="secondary"
              size="sm"
              disabled={busy !== null}
              onClick={() => fileRef.current?.click()}
            >
              {busy === "upload"
                ? t.subiendo
                : imagePreview
                  ? t.cambiarImagen
                  : t.subirImagen}
            </Button>
            {imagePreview ? (
              <Button
                type="button"
                variant="secondary"
                size="sm"
                disabled={busy !== null}
                onClick={() => {
                  setImagePath(null);
                  setImagePreview(null);
                  setSaved(false);
                }}
              >
                {t.quitarImagen}
              </Button>
            ) : null}
            <span className="text-12 text-muted">{t.imagenAyuda}</span>
          </div>
          {errors.image ? (
            <span role="alert" className="text-13 text-alert">
              {errors.image}
            </span>
          ) : null}
        </div>

        <Select
          label={t.servicio}
          value={form.serviceId}
          onChange={(e) => update({ serviceId: e.target.value })}
          error={errors.serviceId}
        >
          {service ? null : (
            <option value="" disabled>
              {t.servicioPlaceholder}
            </option>
          )}
          {services.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name} · {formatMoney(s.priceMinor)}
            </option>
          ))}
        </Select>

        <TextField
          label={t.titulo}
          placeholder={t.tituloPlaceholder}
          value={form.title}
          maxLength={OFFER_TITLE_MAX}
          onChange={(e) => update({ title: e.target.value })}
          error={errors.title}
        />

        <Select
          label={t.categoria}
          value={form.category}
          onChange={(e) => update({ category: e.target.value })}
        >
          {OFFER_CATEGORY_IDS.map((id) => (
            <option key={id} value={id}>
              {descubre.categorias.nombres[id as MarketplaceCategoryId]}
            </option>
          ))}
        </Select>

        {/* Pris */}
        <div className="flex flex-col gap-2">
          <TextField
            label={t.precio}
            inputMode="numeric"
            value={form.offerPrice}
            onChange={(e) => update({ offerPrice: e.target.value })}
            error={errors.offerPrice}
          />
          {service ? (
            <div className="flex flex-col gap-1 rounded-tile bg-canvas p-3">
              <div className="flex items-center justify-between gap-2">
                <span className="text-13 text-ink">
                  {t.precioOrdinario({
                    precio: formatMoney(service.priceMinor),
                  })}
                </span>
                {pct > 0 ? (
                  <Chip tone="lime" size="sm" weight="bold">
                    {t.descuento({ pct })}
                  </Chip>
                ) : null}
              </div>
              <span className="text-13 font-semibold text-ink">
                {t.precioMinimo({ precio: formatMoney(service.lowestMinor) })}
              </span>
              <span className="text-12 text-muted">{t.precioAyuda}</span>
              {service.priceLocked ? (
                <span className="text-12 text-muted">{t.precioBloqueado}</span>
              ) : null}
            </div>
          ) : null}
        </div>

        {/* Det här ingår */}
        <div className="flex flex-col gap-2">
          <span className="text-13 font-semibold text-ink">{t.incluye}</span>
          {includes.map((line, i) => (
            <div key={i} className="flex items-center gap-2">
              <input
                aria-label={`${t.incluye} ${i + 1}`}
                className="h-13 min-w-0 flex-1 rounded-control border-2 border-transparent bg-field px-4 text-15 font-medium text-ink placeholder:text-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
                placeholder={i === 0 ? t.incluyePlaceholder : undefined}
                value={line}
                maxLength={OFFER_INCLUDE_ITEM_MAX}
                onChange={(e) =>
                  update({
                    includes: includes.map((x, j) =>
                      j === i ? e.target.value : x,
                    ),
                  })
                }
              />
              {includes.length > 1 ? (
                <IconButton
                  label={t.quitarFila}
                  tone="ghost"
                  size={36}
                  onClick={() =>
                    update({ includes: includes.filter((_, j) => j !== i) })
                  }
                >
                  <X aria-hidden="true" className="size-4" />
                </IconButton>
              ) : null}
            </div>
          ))}
          {includes.length < OFFER_INCLUDES_MAX ? (
            <Button
              type="button"
              variant="secondary"
              size="sm"
              className="self-start"
              onClick={() => update({ includes: [...includes, ""] })}
            >
              <Plus aria-hidden="true" className="size-4" />
              {t.agregarFila}
            </Button>
          ) : null}
          {errors.includes ? (
            <span role="alert" className="text-13 text-alert">
              {errors.includes}
            </span>
          ) : null}
        </div>

        <Textarea
          label={t.descripcion}
          placeholder={t.descripcionPlaceholder}
          value={form.description}
          maxLength={OFFER_TEXT_MAX}
          onChange={(e) => update({ description: e.target.value })}
        />
        <Textarea
          label={t.condiciones}
          placeholder={t.condicionesPlaceholder}
          value={form.terms}
          maxLength={OFFER_TEXT_MAX}
          onChange={(e) => update({ terms: e.target.value })}
        />

        <div className="grid gap-3 sm:grid-cols-2">
          <TextField
            label={t.cantidad}
            hint={errors.quantity ? undefined : t.cantidadAyuda}
            inputMode="numeric"
            value={form.quantity}
            onChange={(e) => update({ quantity: e.target.value })}
            error={errors.quantity}
          />
          <Select
            label={t.validez}
            value={String(form.validMonths)}
            onChange={(e) => update({ validMonths: Number(e.target.value) })}
          >
            {OFFER_VALID_MONTHS.map((n) => (
              <option key={n} value={n}>
                {t.meses({ n })}
              </option>
            ))}
          </Select>
          <OptionalDate
            label={t.ventanaDesde}
            value={form.saleStartsOn}
            onChange={(v) => update({ saleStartsOn: v })}
          />
          <OptionalDate
            label={t.ventanaHasta}
            value={form.saleEndsOn}
            onChange={(v) => update({ saleEndsOn: v })}
            error={errors.saleEndsOn}
          />
        </div>
      </fieldset>

      {errors.general ? (
        <p role="alert" className="text-13 text-alert">
          {errors.general}
        </p>
      ) : null}

      <div className="flex flex-wrap items-center gap-2">
        {!lockedForMe ? (
          <Button
            type="button"
            size="sm"
            disabled={busy !== null}
            onClick={() => void onSave()}
          >
            {busy === "save" ? t.guardando : saved ? t.guardado : t.guardar}
          </Button>
        ) : null}
        {canPublish && status !== "published" && status !== "ended" ? (
          <Button
            type="button"
            variant="accent"
            size="sm"
            disabled={busy !== null}
            onClick={() => void onStatus("published")}
          >
            {status === "paused" ? t.reanudar : t.publicar}
          </Button>
        ) : null}
        {status === "published" && offerId ? (
          <Button
            type="button"
            variant="secondary"
            size="sm"
            disabled={busy !== null}
            onClick={() => void onStatus("paused")}
          >
            {t.pausar}
          </Button>
        ) : null}
        <Button type="button" variant="secondary" size="sm" onClick={onClose}>
          {t.cancelar}
        </Button>
        {status === "published" && slug ? (
          <a
            href={hrefMarketplace("oferta", slug)}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 text-13 font-semibold text-ink underline-offset-2 hover:underline"
          >
            {t.verPublica}
            <ExternalLink aria-hidden="true" className="size-3.5" />
          </a>
        ) : null}
      </div>
      {!canPublish && status !== "published" ? (
        <p className="text-12 text-muted">{t.soloDueno}</p>
      ) : null}

      {/* Förhandsvisning: samma kort som i Upptäck. */}
      <div className="flex flex-col gap-2 border-t border-line pt-4">
        <span className="text-13 font-semibold text-ink">{t.vistaPrevia}</span>
        <div inert className="rounded-tile bg-canvas p-4">
          <div className="max-w-80">
            <OfferCard
              offer={{
                id: offerId ?? "nuevo",
                slug: slug ?? "",
                title: form.title || t.tituloPlaceholder,
                imageUrl:
                  imagePreview && !imagePreview.startsWith("blob:")
                    ? imagePreview
                    : null,
                category: form.category as MarketplaceCategoryId,
                regularMinor: service?.lowestMinor ?? 0,
                priceMinor: priceMinor || (service?.lowestMinor ?? 0),
                discountPct: pct,
                business: {
                  id: "",
                  name: business.name,
                  slug: business.slug,
                  areaName: business.areaName,
                  lat: null,
                  lng: null,
                },
                rating: null,
                distanceKm: null,
                flashToday: null,
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
