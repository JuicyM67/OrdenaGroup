"use client";

// WP-66 (D-046): "Flytta hit från ditt nuvarande bokningssystem". Ägaren
// klistrar in länken (eller texten) → servern låter Claude läsa sidan
// (`POST /api/import/extract`, avbrytbart) → förhandsgranskning grupperad i
// Perfil / Horario / Categorías y servicios / Equipo med kryssrutor per post
// (förvalda: det här är inget samtycke), redigerbara priser/längder, "ya
// existe" och varningar. Vad som händer med urvalet bestämmer anroparen:
// onboarding fyller wizarden, Ajustes importerar via en server action.
import { useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { TextField } from "@/components/ui/text-field";
import { Textarea } from "@/components/ui/textarea";
import { WEEKDAY_LONG } from "@/lib/format/calendar";
import type {
  ImportExtractResponse,
  ImportHour,
  ImportPreview,
  ImportPreviewService,
  ImportPreviewStaff,
  ImportProfileField,
} from "@/lib/validation/import";
import { LoadingChecklist } from "@/components/onboarding/loading-checklist";
import { importar, negocio } from "@/i18n";

/** Det ägaren valde, efter redigering. */
export type ImportChoice = {
  business: {
    name?: string;
    district?: string;
    phone?: string;
    category?: string;
  };
  profile: Partial<Record<ImportProfileField, string>>;
  hours: ImportHour[] | null;
  services: ImportPreviewService[];
  staff: ImportPreviewStaff[];
};

export type ImportPanelProps = {
  mode: "onboarding" | "ajustes";
  /** "Bokadirekt, Fresha, …" (från servern, `platforms.ts`). */
  platformNames: string;
  /** Returnerar ett meddelande att visa (lyckat eller fel). */
  onConfirm: (
    choice: ImportChoice,
  ) => Promise<{ ok: boolean; message: string }>;
};

type Phase = "input" | "loading" | "preview" | "done";

const PROGRESS = [
  importar.progreso.leyendo,
  importar.progreso.servicios,
  importar.progreso.precios,
  importar.progreso.casi,
];

const PROFILE_FIELDS: { key: ImportProfileField; label: string }[] = [
  { key: "about", label: importar.campos.sobre },
  { key: "address", label: importar.campos.direccion },
  { key: "phone", label: importar.campos.telefono },
  { key: "instagram", label: importar.campos.instagram },
  { key: "tiktok", label: importar.campos.tiktok },
  { key: "facebook", label: importar.campos.facebook },
];

type BusinessField = "name" | "district" | "category";

function errorText(code: string): string {
  const key = code.replace(/^import\./, "") as keyof typeof importar.errores;
  return importar.errores[key] ?? importar.errores.failed;
}

function Check({
  checked,
  onChange,
  disabled,
  children,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label className="flex items-start gap-2.5 text-14 text-ink">
      <input
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={(e) => onChange(e.target.checked)}
        className="mt-0.5 size-4 shrink-0 accent-ink"
      />
      <span className="flex min-w-0 flex-col gap-0.5">{children}</span>
    </label>
  );
}

export function ImportPanel({
  mode,
  platformNames,
  onConfirm,
}: ImportPanelProps) {
  const [phase, setPhase] = useState<Phase>("input");
  const [source, setSource] = useState<"url" | "text">("url");
  const [url, setUrl] = useState("");
  const [text, setText] = useState("");
  const [error, setError] = useState<string | undefined>();
  const [suggestText, setSuggestText] = useState(false);
  const [preview, setPreview] = useState<ImportPreview | null>(null);
  const [message, setMessage] = useState<string | undefined>();
  const [saving, setSaving] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  // Selektion + redigering
  const [bizSel, setBizSel] = useState<Record<BusinessField, boolean>>({
    name: true,
    district: true,
    category: true,
  });
  const [profileSel, setProfileSel] = useState<
    Record<ImportProfileField, boolean>
  >({
    about: true,
    address: true,
    phone: true,
    instagram: true,
    tiktok: true,
    facebook: true,
  });
  const [hoursSel, setHoursSel] = useState(true);
  const [services, setServices] = useState<ImportPreviewService[]>([]);
  const [servicesSel, setServicesSel] = useState<boolean[]>([]);
  const [staffSel, setStaffSel] = useState<boolean[]>([]);

  // WP-92: stegen i laddningen drivs av `LoadingChecklist` (9 s per steg).
  useEffect(() => () => abortRef.current?.abort(), []);

  async function run() {
    setError(undefined);
    setSuggestText(false);
    setPhase("loading");
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    try {
      const res = await fetch("/api/import/extract", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(
          source === "url" ? { source, url } : { source, text },
        ),
        signal: ctrl.signal,
      });
      const body = (await res.json()) as ImportExtractResponse;
      if (!body.ok) {
        setError(errorText(body.code));
        setSuggestText(
          source === "url" &&
            [
              "import.platform_unsupported",
              "import.fetch_failed",
              "import.empty",
              "import.refused",
            ].includes(body.code),
        );
        setPhase("input");
        return;
      }
      const p = body.preview;
      setPreview(p);
      setServices(p.services);
      setServicesSel(p.services.map((s) => !s.exists));
      setStaffSel(p.staff.map((s) => !s.exists));
      setHoursSel(p.hours.length > 0);
      setPhase("preview");
    } catch {
      setError(
        ctrl.signal.aborted
          ? importar.errores.cancelled
          : importar.errores.failed,
      );
      setPhase("input");
    } finally {
      abortRef.current = null;
    }
  }

  function cancel() {
    abortRef.current?.abort();
  }

  function updateService(i: number, patch: Partial<ImportPreviewService>) {
    setServices((prev) =>
      prev.map((s, idx) => (idx === i ? { ...s, ...patch } : s)),
    );
  }

  // WP-92: laddningen som en checklista (samma stil som onboardingens stegpanel).
  if (phase === "loading") {
    return (
      <LoadingChecklist
        title={importar.cargandoTitulo}
        text={importar.aviso}
        steps={PROGRESS}
        stepMs={9000}
        footer={
          <Button
            type="button"
            variant="secondary"
            size="md"
            className="self-start"
            onClick={cancel}
          >
            {importar.ctaCancelar}
          </Button>
        }
      />
    );
  }

  if (!preview || phase === "input") {
    return (
      <Card className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <h2 className="text-17 font-bold text-ink">
            {mode === "onboarding" ? importar.titulo : importar.tituloAjustes}
          </h2>
          <p className="text-13 text-muted">
            {mode === "onboarding" ? importar.intro : importar.introAjustes}
          </p>
        </div>

        {
          <>
            {source === "url" ? (
              <TextField
                label={importar.linkLabel}
                placeholder={importar.linkPlaceholder}
                hint={importar.plataformas({ lista: platformNames })}
                inputMode="url"
                autoComplete="off"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                maxLength={2000}
              />
            ) : (
              <Textarea
                label={importar.textoLabel}
                hint={importar.textoAyuda}
                rows={8}
                value={text}
                onChange={(e) => setText(e.target.value)}
                maxLength={30000}
              />
            )}
            {error ? (
              <p role="alert" className="text-13 font-semibold text-ink">
                {error}
              </p>
            ) : null}
            <div className="flex flex-wrap gap-3">
              <Button
                type="button"
                size="lg"
                disabled={source === "url" ? !url.trim() : !text.trim()}
                onClick={() => void run()}
              >
                {importar.ctaLeer}
              </Button>
              <Button
                type="button"
                variant={suggestText ? "accent" : "secondary"}
                size="lg"
                onClick={() => {
                  setSource(source === "url" ? "text" : "url");
                  setError(undefined);
                  setSuggestText(false);
                }}
              >
                {source === "url"
                  ? importar.ctaPegarTexto
                  : importar.ctaUsarLink}
              </Button>
            </div>
          </>
        }
      </Card>
    );
  }

  const p = preview;
  type Field = { key: BusinessField; label: string; value: string };
  const bizFields: Field[] =
    mode === "onboarding"
      ? (
          [
            {
              key: "name",
              label: importar.campos.nombre,
              value: p.profile.name,
            },
            {
              key: "district",
              label: importar.campos.comuna,
              value: p.profile.district,
            },
            {
              key: "category",
              label: importar.campos.rubro,
              value: p.profile.category
                ? (negocio.rubros[
                    p.profile.category as keyof typeof negocio.rubros
                  ] ?? "")
                : "",
            },
          ] satisfies Field[]
        ).filter((f) => f.value)
      : [];
  const profileFields = PROFILE_FIELDS.filter((f) => p.profile[f.key]);
  type Info = { label: string; value: string };
  const infoCandidates: (Info | null)[] = [
    mode === "ajustes" && p.profile.name
      ? { label: importar.campos.nombre, value: p.profile.name }
      : null,
    p.profile.email
      ? { label: importar.campos.email, value: p.profile.email }
      : null,
    p.profile.website
      ? { label: importar.campos.web, value: p.profile.website }
      : null,
  ];
  const infoOnly = infoCandidates.filter((x): x is Info => x !== null);

  const count =
    bizFields.filter((f) => bizSel[f.key]).length +
    profileFields.filter((f) => profileSel[f.key]).length +
    (hoursSel && p.hours.length > 0 ? 1 : 0) +
    servicesSel.filter((v, i) => v && !services[i]?.exists).length +
    staffSel.filter((v, i) => v && !p.staff[i]?.exists).length;

  async function confirm() {
    if (count === 0) {
      setMessage(importar.ningunoSeleccionado);
      return;
    }
    setSaving(true);
    setMessage(undefined);
    const choice: ImportChoice = {
      business: Object.fromEntries(
        bizFields
          .filter((f) => bizSel[f.key])
          .map((f) => [
            f.key,
            f.key === "category" ? p.profile.category : p.profile[f.key],
          ]),
      ),
      profile: Object.fromEntries(
        profileFields
          .filter((f) => profileSel[f.key])
          .map((f) => [f.key, p.profile[f.key]]),
      ),
      hours: hoursSel && p.hours.length > 0 ? p.hours : null,
      services: services.filter((s, i) => servicesSel[i] && !s.exists),
      staff: p.staff.filter((s, i) => staffSel[i] && !s.exists),
    };
    if (mode === "onboarding" && bizSel.name === false) {
      delete choice.business.name;
    }
    try {
      const r = await onConfirm(choice);
      setMessage(r.message);
      if (r.ok) setPhase("done");
    } catch {
      setMessage(importar.errores.failed);
    } finally {
      setSaving(false);
    }
  }

  if (phase === "done") {
    return (
      <Card className="flex flex-col gap-3">
        <p role="status" className="text-15 font-semibold text-ink">
          {message}
        </p>
      </Card>
    );
  }

  return (
    <Card className="flex flex-col gap-5">
      <div className="flex flex-col gap-1.5">
        {p.platformName ? (
          <p className="text-13 font-semibold text-muted">
            {importar.desde({ plataforma: p.platformName })}
          </p>
        ) : null}
        <h2 className="text-17 font-bold text-ink">{importar.revisarTitulo}</h2>
        <p className="text-13 text-muted">{importar.revisarIntro}</p>
        {p.confidence === "low" ? (
          <p className="rounded-event bg-peach px-3 py-2 text-13 text-ink">
            {importar.confianzaBaja}
          </p>
        ) : null}
      </div>

      {bizFields.length + profileFields.length + infoOnly.length > 0 ? (
        <section className="flex flex-col gap-3">
          <h3 className="text-15 font-bold text-ink">
            {importar.grupos.perfil}
          </h3>
          {bizFields.map((f) => (
            <Check
              key={f.key}
              checked={bizSel[f.key]}
              onChange={(v) => setBizSel({ ...bizSel, [f.key]: v })}
            >
              <span className="text-13 font-semibold text-muted">
                {f.label}
              </span>
              <span className="break-words">{f.value}</span>
            </Check>
          ))}
          {profileFields.map((f) => (
            <Check
              key={f.key}
              checked={profileSel[f.key]}
              onChange={(v) => setProfileSel({ ...profileSel, [f.key]: v })}
            >
              <span className="text-13 font-semibold text-muted">
                {f.label}
              </span>
              <span className="break-words whitespace-pre-line">
                {p.profile[f.key]}
              </span>
            </Check>
          ))}
          {infoOnly.map((f) => (
            <p key={f.label} className="flex flex-col gap-0.5 pl-6.5 text-14">
              <span className="text-13 font-semibold text-muted">
                {f.label} · {importar.soloInfo}
              </span>
              <span className="break-words text-ink">{f.value}</span>
            </p>
          ))}
        </section>
      ) : null}

      {p.hours.length > 0 ? (
        <section className="flex flex-col gap-3">
          <h3 className="text-15 font-bold text-ink">
            {importar.grupos.horario}
          </h3>
          <Check checked={hoursSel} onChange={setHoursSel}>
            <span className="font-semibold">{importar.todoElHorario}</span>
            <span className="flex flex-col gap-0.5 text-13 text-muted">
              {p.hours.map((h) => (
                <span key={h.weekday}>
                  {WEEKDAY_LONG[h.weekday - 1]}:{" "}
                  {h.open ? `${h.start}–${h.end}` : importar.cerrado}
                </span>
              ))}
            </span>
          </Check>
        </section>
      ) : null}

      {services.length > 0 ? (
        <section className="flex flex-col gap-3">
          <h3 className="text-15 font-bold text-ink">
            {importar.grupos.servicios}
          </h3>
          {services.map((s, i) => (
            <div
              key={`${s.name}-${i}`}
              className="flex flex-col gap-2 rounded-tile bg-canvas p-3"
            >
              <Check
                checked={!s.exists && (servicesSel[i] ?? false)}
                disabled={s.exists}
                onChange={(v) =>
                  setServicesSel((prev) =>
                    prev.map((x, idx) => (idx === i ? v : x)),
                  )
                }
              >
                <span className="font-semibold">{s.name}</span>
                {s.category ? (
                  <span className="text-12 text-muted">
                    {importar.categoria({ nombre: s.category })}
                  </span>
                ) : null}
                {s.description ? (
                  <span className="text-13 text-muted">{s.description}</span>
                ) : null}
                {s.exists ? (
                  <span className="text-12 font-semibold text-muted">
                    {importar.yaExiste}
                  </span>
                ) : null}
              </Check>
              {!s.exists && servicesSel[i] ? (
                <div className="flex gap-3 pl-6.5">
                  <TextField
                    label={importar.campos.duracion}
                    inputMode="numeric"
                    value={s.durationMin}
                    onChange={(e) =>
                      updateService(i, { durationMin: e.target.value })
                    }
                    error={s.durationMin ? undefined : importar.faltaDuracion}
                  />
                  <TextField
                    label={importar.campos.precio}
                    inputMode="numeric"
                    value={s.price}
                    onChange={(e) =>
                      updateService(i, { price: e.target.value })
                    }
                    error={s.price ? undefined : importar.faltaPrecio}
                    hint={s.priceFrom ? importar.precioDesde : undefined}
                  />
                </div>
              ) : null}
            </div>
          ))}
        </section>
      ) : null}

      {p.staff.length > 0 ? (
        <section className="flex flex-col gap-3">
          <h3 className="text-15 font-bold text-ink">
            {importar.grupos.equipo}
          </h3>
          {p.staff.map((st, i) => (
            <Check
              key={`${st.name}-${i}`}
              checked={!st.exists && (staffSel[i] ?? false)}
              disabled={st.exists}
              onChange={(v) =>
                setStaffSel((prev) => prev.map((x, idx) => (idx === i ? v : x)))
              }
            >
              <span className="font-semibold">{st.name}</span>
              {st.title ? (
                <span className="text-13 text-muted">{st.title}</span>
              ) : null}
              {st.exists ? (
                <span className="text-12 font-semibold text-muted">
                  {importar.yaExiste}
                </span>
              ) : null}
            </Check>
          ))}
        </section>
      ) : null}

      {p.images.logoUrl || p.images.coverUrl ? (
        <p className="flex flex-wrap gap-x-3 gap-y-1 text-13 text-muted">
          <span>{importar.imagenes}</span>
          {p.images.logoUrl ? (
            <a
              href={p.images.logoUrl}
              target="_blank"
              rel="noopener noreferrer nofollow"
              className="font-semibold text-ink underline"
            >
              {importar.verLogo}
            </a>
          ) : null}
          {p.images.coverUrl ? (
            <a
              href={p.images.coverUrl}
              target="_blank"
              rel="noopener noreferrer nofollow"
              className="font-semibold text-ink underline"
            >
              {importar.verPortada}
            </a>
          ) : null}
        </p>
      ) : null}

      {p.notes.length > 0 ? (
        <section className="flex flex-col gap-1.5 rounded-tile bg-canvas p-3">
          <h3 className="text-13 font-bold text-ink">{importar.notasTitulo}</h3>
          <ul className="flex list-disc flex-col gap-1 pl-5 text-13 text-muted">
            {p.notes.map((n) => (
              <li key={n}>{n}</li>
            ))}
          </ul>
        </section>
      ) : null}

      {message ? (
        <p role="alert" className="text-13 font-semibold text-ink">
          {message}
        </p>
      ) : null}

      <div className="flex flex-wrap gap-3">
        <Button
          type="button"
          size="lg"
          disabled={saving}
          onClick={() => void confirm()}
        >
          {saving
            ? importar.importando
            : mode === "onboarding"
              ? importar.ctaUsar
              : importar.ctaImportar({ n: count })}
        </Button>
        <Button
          type="button"
          variant="secondary"
          size="lg"
          disabled={saving}
          onClick={() => {
            setPreview(null);
            setMessage(undefined);
            setPhase("input");
          }}
        >
          {importar.ctaDescartar}
        </Button>
      </div>
    </Card>
  );
}
