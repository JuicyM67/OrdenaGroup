"use client";

import { useRouter } from "next/navigation";

// Sección "Tu negocio" (WP-15b slim → WP-55: separada de "Reglas de reserva", ver
// `booking-rules-section.tsx`, ahora cada una en su propia pestaña de Ajustes). Mismos
// campos y mismas reglas de slug que onboarding (business-step.tsx), reutilizando sus
// validadores de cliente. Las dos secciones siguen escribiendo en la misma fila de
// `businesses` (mismo `action`) — esta solo edita/envía los campos de "Tu negocio";
// los campos de reglas viajan sin cambios desde `business` (ver `handleSubmit`).
import { X } from "lucide-react";
import { useState } from "react";

import {
  validatePhone,
  validateRequired,
  validateSlug,
} from "@/components/onboarding/client-validation";
import { TuLinkCard } from "@/components/shared/tu-link-card";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { TextField } from "@/components/ui/text-field";
import { appHref } from "@/config/routes";
import { ajustes, negocio } from "@/i18n";

import { ajustesErrorText } from "./error-text";
import type { AjustesActions, AjustesBusiness } from "./types";

type FormState = {
  name: string;
  slug: string;
  comuna: string;
  phone: string;
  address: string;
  /** WP-85 (D-070): "Vi kommer till kunden" + orterna. */
  servesAtCustomer: boolean;
  serviceAreas: string[];
};

const SERVICE_AREAS_MAX = 30;

function toFormState(b: AjustesBusiness): FormState {
  return {
    name: b.name,
    slug: b.slug,
    comuna: b.comuna,
    phone: b.phone,
    address: b.address,
    servesAtCustomer: b.servesAtCustomer,
    serviceAreas: b.serviceAreas,
  };
}

type Errors = Partial<
  Record<"name" | "slug" | "comuna" | "phone" | "address" | "zonas", string>
>;

export function BusinessSection({
  business,
  onSaved,
  action,
}: {
  business: AjustesBusiness;
  /** Utan onSaved laddas sidan om (flikarna i WP-55 är egna rutter). */
  onSaved?: (business: AjustesBusiness) => void;
  action: AjustesActions["updateBusinessSettings"];
}) {
  const router = useRouter();
  const [form, setForm] = useState<FormState>(() => toFormState(business));
  const [errors, setErrors] = useState<Errors>({});
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">(
    "idle",
  );
  const [submitError, setSubmitError] = useState<string | undefined>();
  const [newArea, setNewArea] = useState("");

  function addArea() {
    const name = newArea.trim();
    if (!name) return;
    setNewArea("");
    if (
      form.serviceAreas.some((a) => a.toLowerCase() === name.toLowerCase()) ||
      form.serviceAreas.length >= SERVICE_AREAS_MAX
    ) {
      return;
    }
    set("serviceAreas", [...form.serviceAreas, name.slice(0, 80)]);
  }

  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((f) => ({ ...f, [key]: value }));
    setStatus("idle");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const name = validateRequired(form.name, "business.name_empty");
    const slug = validateSlug(form.slug);
    const comuna = validateRequired(form.comuna, "business.comuna_empty");
    const phone = validatePhone(form.phone);
    const next: Errors = {};
    if (!name.ok) next.name = ajustesErrorText(name.code);
    if (!slug.ok) next.slug = ajustesErrorText(slug.code);
    if (!comuna.ok) next.comuna = ajustesErrorText(comuna.code);
    if (!phone.ok) next.phone = ajustesErrorText(phone.code);
    // WP-85 (D-070): adress, eller minst en ort för den som kommer till kunden.
    if (!form.servesAtCustomer) {
      const address = validateRequired(form.address, "business.address_empty");
      if (!address.ok) next.address = ajustesErrorText(address.code);
    } else if (form.serviceAreas.length === 0) {
      next.zonas = negocio.campos.zonasVacio;
    }
    setErrors(next);
    if (Object.keys(next).length > 0) return;

    setStatus("saving");
    setSubmitError(undefined);
    try {
      const result = await action({
        name: form.name,
        slug: form.slug.trim().toLowerCase(),
        comuna: form.comuna,
        phone: form.phone,
        address: form.address,
        servesAtCustomer: form.servesAtCustomer,
        serviceAreas: form.serviceAreas,
        // "Reglas de reserva" vive en su propia pestaña (booking-rules-section.tsx) pero
        // `updateBusinessSettings` escribe la fila entera: viajan sin cambios.
        minNoticeMinutes: business.minNoticeMinutes,
        maxDaysAhead: business.maxDaysAhead,
        cancelWindowHours: business.cancelWindowHours,
        slotIntervalMinutes: business.slotIntervalMinutes,
        autoConfirmBookings: business.autoConfirmBookings,
      });
      if (result.ok) {
        setStatus("saved");
        (onSaved ?? (() => router.refresh()))({
          ...business,
          name: form.name,
          slug: form.slug.trim().toLowerCase(),
          comuna: form.comuna,
          phone: form.phone,
          address: form.address,
          servesAtCustomer: form.servesAtCustomer,
          serviceAreas: form.serviceAreas,
        });
      } else {
        setStatus("error");
        setSubmitError(ajustesErrorText(result.code));
      }
    } catch {
      setStatus("error");
      setSubmitError(ajustesErrorText("unknown"));
    }
  }

  const slugChanged = form.slug.trim().toLowerCase() !== business.slug;

  return (
    <div className="flex flex-col gap-6">
      {/* UX-granskning (sección "Inställningar", fel 4-grannen "Bokningslänk-kortet"):
          flyttad hit från AjustesShell (toppen av varje flik) — hör hemma på "Tu negocio",
          inte upprepad på t.ex. Öppettider. */}
      {/* WP-89 (D-075): Tu negocio och Comparte tu link kräver samma behörighet
          (`can_edit_settings`), så länken till guiden visas alltid här. */}
      <TuLinkCard
        slug={business.slug}
        businessName={business.name}
        guideHref={appHref("appAjustesCompartir")}
      />

      <form
        onSubmit={(e) => void handleSubmit(e)}
        className="flex flex-col gap-6"
      >
        <Card radius="tile" padding="lg" className="flex flex-col gap-4">
          <h2 className="text-18 font-bold text-ink">
            {ajustes.secciones.negocio}
          </h2>

          <TextField
            label={negocio.campos.nameLabel}
            value={form.name}
            onChange={(e) => set("name", e.target.value)}
            error={errors.name}
            maxLength={120}
          />

          {/* WP-62 (D-042): fälten kortare än en rad parar ihop i en 2-kolumnsgrid på
              desktop i stället för att staplas en och en — mindre scroll på breda skärmar. */}
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <TextField
                label={negocio.slug.label}
                hint={
                  errors.slug
                    ? undefined
                    : slugChanged
                      ? ajustes.slugAviso
                      : negocio.slug.ayuda
                }
                value={form.slug}
                onChange={(e) => set("slug", e.target.value)}
                error={errors.slug}
                maxLength={40}
              />
              {form.slug ? (
                <p className="text-13 text-muted">
                  {negocio.slug.vistaPrevia({ url: `/${form.slug}` })}
                </p>
              ) : null}
            </div>

            <TextField
              label={negocio.campos.comunaLabel}
              value={form.comuna}
              onChange={(e) => set("comuna", e.target.value)}
              error={errors.comuna}
              maxLength={80}
            />

            <TextField
              label={negocio.campos.phoneLabel}
              hint={errors.phone ? undefined : negocio.campos.phoneAyuda}
              value={form.phone}
              onChange={(e) => set("phone", e.target.value)}
              error={errors.phone}
            />

            {form.servesAtCustomer ? null : (
              <TextField
                label={negocio.campos.addressLabel}
                hint={errors.address ? undefined : negocio.campos.addressAyuda}
                placeholder={negocio.campos.addressPlaceholder}
                value={form.address}
                onChange={(e) => set("address", e.target.value)}
                error={errors.address}
                maxLength={200}
                autoComplete="street-address"
              />
            )}
          </div>

          <label className="flex cursor-pointer items-start gap-3 text-14 text-ink">
            <input
              type="checkbox"
              checked={form.servesAtCustomer}
              onChange={(e) => set("servesAtCustomer", e.target.checked)}
              className="mt-0.5 size-5 shrink-0 accent-ink"
            />
            <span className="flex flex-col gap-0.5">
              <span className="font-semibold">{negocio.campos.sinLocal}</span>
              <span className="text-13 text-muted">
                {negocio.campos.sinLocalAyuda}
              </span>
            </span>
          </label>

          {form.servesAtCustomer ? (
            <div className="flex flex-col gap-2.5">
              <div className="flex items-end gap-2 lg:max-w-120">
                <TextField
                  label={negocio.campos.zonasLabel}
                  placeholder={negocio.campos.zonasPlaceholder}
                  value={newArea}
                  onChange={(e) => setNewArea(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      addArea();
                    }
                  }}
                  error={errors.zonas}
                  maxLength={80}
                  className="flex-1"
                />
                <Button
                  type="button"
                  variant="secondary"
                  size="2xl"
                  onClick={addArea}
                  disabled={form.serviceAreas.length >= SERVICE_AREAS_MAX}
                  className="shrink-0"
                >
                  {negocio.campos.zonasAgregar}
                </Button>
              </div>
              {errors.zonas ? null : (
                <p className="-mt-1 text-13 text-muted">
                  {negocio.campos.zonasAyuda}
                </p>
              )}
              {form.serviceAreas.length > 0 ? (
                <ul className="flex flex-wrap gap-2">
                  {form.serviceAreas.map((a) => (
                    <li key={a}>
                      <button
                        type="button"
                        onClick={() =>
                          set(
                            "serviceAreas",
                            form.serviceAreas.filter((x) => x !== a),
                          )
                        }
                        aria-label={negocio.campos.zonasQuitar({ comuna: a })}
                        className="flex h-9 items-center gap-1.5 rounded-full bg-ink pr-2.5 pl-3.5 text-13 font-semibold text-on-dark focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
                      >
                        {a}
                        <X
                          aria-hidden="true"
                          className="size-3.5"
                          strokeWidth={2.5}
                        />
                      </button>
                    </li>
                  ))}
                </ul>
              ) : null}
              {form.serviceAreas.length >= SERVICE_AREAS_MAX ? (
                <p className="text-12 text-muted">
                  {negocio.campos.zonasMax({ max: SERVICE_AREAS_MAX })}
                </p>
              ) : null}
            </div>
          ) : null}
        </Card>

        {submitError ? (
          <p role="alert" className="text-13 font-semibold text-ink">
            {submitError}
          </p>
        ) : null}

        <div className="flex items-center gap-3 lg:sticky lg:bottom-0 lg:z-10 lg:bg-canvas lg:py-3">
          <Button type="submit" size="xl" disabled={status === "saving"}>
            {status === "saving" ? ajustes.guardando : ajustes.guardarCambios}
          </Button>
          {status === "saved" ? (
            <span role="status" className="text-13 text-muted">
              {ajustes.cambiosGuardados}
            </span>
          ) : null}
        </div>
      </form>
    </div>
  );
}
