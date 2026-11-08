"use client";

// WP-88 (D-074): Ajustes → Ficha. Vilka fasta fält fichan visar och
// consentimiento-mallarna (titel + fritext) med tjänsterna som kräver dem vid
// bokning. Ingen DELETE: en mall som kunder godkänt arkiveras (`Activo` av).
// Servern (`src/server/records/settings.ts`) kontrollerar behörighet och plan.
import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Chip } from "@/components/ui/chip";
import { Switch } from "@/components/ui/switch";
import { TextField } from "@/components/ui/text-field";
import { Textarea } from "@/components/ui/textarea";
import { fichaAtencion } from "@/i18n";

import {
  RECORD_FIELD_KEYS,
  type ConsentTemplateItem,
  type RecordFieldKey,
  type RecordSettingsActions,
  type RecordSettingsData,
} from "./types";

type Draft = {
  id: string | null;
  title: string;
  body: string;
  active: boolean;
  serviceIds: string[];
};

const EMPTY_DRAFT: Draft = {
  id: null,
  title: "",
  body: "",
  active: true,
  serviceIds: [],
};

function errorFor(code: string): string {
  if (code === "limit") return fichaAtencion.ajustes.errorLimite;
  return code in fichaAtencion.errores
    ? fichaAtencion.errores[code as keyof typeof fichaAtencion.errores]
    : fichaAtencion.errores.unexpected;
}

export function FichaSettingsSection({
  data,
  actions,
  locked,
}: {
  data: RecordSettingsData;
  actions: RecordSettingsActions;
  /** Planen saknar `records`: bara läsning (uppgraderingsrutan visas ovanför). */
  locked: boolean;
}) {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h2 className="text-18 font-bold text-ink">
          {fichaAtencion.ajustes.titulo}
        </h2>
        <p className="text-14 leading-body text-muted">
          {fichaAtencion.ajustes.intro}
        </p>
      </div>
      <FieldsCard data={data} actions={actions} locked={locked} />
      <TemplatesCard data={data} actions={actions} locked={locked} />
    </div>
  );
}

function FieldsCard({
  data,
  actions,
  locked,
}: {
  data: RecordSettingsData;
  actions: RecordSettingsActions;
  locked: boolean;
}) {
  const router = useRouter();
  const [fields, setFields] = useState<RecordFieldKey[]>(data.fields);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<string | null>(null);

  function toggle(k: RecordFieldKey, on: boolean) {
    setStatus(null);
    setFields((prev) =>
      on ? [...prev.filter((f) => f !== k), k] : prev.filter((f) => f !== k),
    );
  }

  async function save() {
    if (busy) return;
    setBusy(true);
    const r = await actions.saveFields(fields);
    setBusy(false);
    setStatus(r.ok ? fichaAtencion.ajustes.camposGuardados : errorFor(r.code));
    if (r.ok) router.refresh();
  }

  return (
    <Card radius="tile" padding="lg" className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <h3 className="text-15 font-bold text-ink">
          {fichaAtencion.ajustes.camposTitulo}
        </h3>
        <p className="text-13 text-muted">
          {fichaAtencion.ajustes.camposAyuda}
        </p>
      </div>
      <div className="flex flex-col gap-3">
        {RECORD_FIELD_KEYS.map((k) => (
          <div key={k} className="flex items-center justify-between gap-3">
            <span className="text-14 font-semibold text-ink">
              {fichaAtencion.campos[k]}
            </span>
            <Switch
              label={fichaAtencion.campos[k]}
              checked={fields.includes(k)}
              disabled={locked}
              onChange={(on) => {
                toggle(k, on);
              }}
            />
          </div>
        ))}
      </div>
      <div className="flex items-center gap-3">
        <Button
          type="button"
          variant="secondary"
          size="sm"
          disabled={locked || busy}
          onClick={() => void save()}
        >
          {fichaAtencion.ajustes.ctaGuardarCampos}
        </Button>
        {status ? (
          <span role="status" className="text-13 text-muted">
            {status}
          </span>
        ) : null}
      </div>
    </Card>
  );
}

function TemplatesCard({
  data,
  actions,
  locked,
}: {
  data: RecordSettingsData;
  actions: RecordSettingsActions;
  locked: boolean;
}) {
  const router = useRouter();
  const [draft, setDraft] = useState<Draft | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);

  function edit(t: ConsentTemplateItem | null) {
    setError(null);
    setStatus(null);
    setDraft(
      t
        ? {
            id: t.id,
            title: t.title,
            body: t.body,
            active: t.active,
            serviceIds: t.serviceIds,
          }
        : EMPTY_DRAFT,
    );
  }

  async function save() {
    if (!draft || busy) return;
    const title = draft.title.trim();
    const body = draft.body.trim();
    if (!title || title.length > 120) {
      setError(fichaAtencion.ajustes.errorTitulo);
      return;
    }
    if (!body) {
      setError(fichaAtencion.ajustes.errorTexto);
      return;
    }
    setBusy(true);
    setError(null);
    const r = await actions.saveTemplate({ ...draft, title, body });
    setBusy(false);
    if (r.ok) {
      setDraft(null);
      setStatus(fichaAtencion.ajustes.guardado);
      router.refresh();
    } else {
      setError(errorFor(r.code));
    }
  }

  const serviceName = new Map(data.services.map((s) => [s.id, s.name]));

  return (
    <Card radius="tile" padding="lg" className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <h3 className="text-15 font-bold text-ink">
          {fichaAtencion.ajustes.plantillasTitulo}
        </h3>
        <p className="text-13 leading-body text-muted">
          {fichaAtencion.ajustes.plantillasAyuda}
        </p>
      </div>

      {data.templates.length === 0 ? (
        <p className="text-13 text-muted">
          {fichaAtencion.ajustes.plantillasVacio}
        </p>
      ) : (
        <ul className="flex flex-col">
          {data.templates.map((t) => (
            <li
              key={t.id}
              className="flex flex-wrap items-center justify-between gap-2 border-b border-line py-3 last:border-b-0"
            >
              <div className="flex min-w-0 flex-col gap-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-14 font-semibold text-ink">
                    {t.title}
                  </span>
                  {!t.active ? (
                    <Chip tone="neutral" size="sm">
                      {fichaAtencion.ajustes.archivado}
                    </Chip>
                  ) : null}
                </div>
                <span className="text-13 text-muted">
                  {t.serviceIds.length > 0
                    ? t.serviceIds
                        .map((id) => serviceName.get(id))
                        .filter(Boolean)
                        .join(", ")
                    : fichaAtencion.ajustes.servicios({ n: 0 })}
                </span>
              </div>
              {!locked ? (
                <Button
                  type="button"
                  variant="secondary"
                  size="xs"
                  onClick={() => {
                    edit(t);
                  }}
                >
                  {fichaAtencion.ajustes.ctaEditar}
                </Button>
              ) : null}
            </li>
          ))}
        </ul>
      )}

      {draft ? (
        <div className="flex flex-col gap-4 border-t border-line pt-4">
          <TextField
            label={fichaAtencion.ajustes.tituloLabel}
            placeholder={fichaAtencion.ajustes.tituloPlaceholder}
            maxLength={120}
            value={draft.title}
            onChange={(e) => {
              setDraft({ ...draft, title: e.target.value });
            }}
          />
          <Textarea
            label={fichaAtencion.ajustes.textoLabel}
            placeholder={fichaAtencion.ajustes.textoPlaceholder}
            maxLength={20000}
            rows={10}
            value={draft.body}
            onChange={(e) => {
              setDraft({ ...draft, body: e.target.value });
            }}
          />
          <fieldset className="flex flex-col gap-2">
            <legend className="mb-2 text-13 font-semibold text-ink">
              {fichaAtencion.ajustes.serviciosLabel}
            </legend>
            {data.services.length === 0 ? (
              <p className="text-13 text-muted">
                {fichaAtencion.ajustes.serviciosVacio}
              </p>
            ) : (
              data.services.map((s) => (
                <label
                  key={s.id}
                  className="flex items-center gap-2.5 text-14 text-ink"
                >
                  <input
                    type="checkbox"
                    className="size-5 accent-ink"
                    checked={draft.serviceIds.includes(s.id)}
                    onChange={(e) => {
                      const on = e.target.checked;
                      setDraft({
                        ...draft,
                        serviceIds: on
                          ? [...draft.serviceIds, s.id]
                          : draft.serviceIds.filter((x) => x !== s.id),
                      });
                    }}
                  />
                  {s.name}
                </label>
              ))
            )}
          </fieldset>
          <div className="flex items-center justify-between gap-3">
            <div className="flex flex-col">
              <span className="text-14 font-semibold text-ink">
                {fichaAtencion.ajustes.activoLabel}
              </span>
              <span className="text-13 text-muted">
                {fichaAtencion.ajustes.activoAyuda}
              </span>
            </div>
            <Switch
              label={fichaAtencion.ajustes.activoLabel}
              checked={draft.active}
              onChange={(on) => {
                setDraft({ ...draft, active: on });
              }}
            />
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              variant="primary"
              size="sm"
              disabled={busy}
              onClick={() => void save()}
            >
              {fichaAtencion.ajustes.ctaGuardar}
            </Button>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => {
                setDraft(null);
                setError(null);
              }}
            >
              {fichaAtencion.ajustes.ctaCancelar}
            </Button>
          </div>
        </div>
      ) : !locked ? (
        <Button
          type="button"
          variant="secondary"
          size="sm"
          className="self-start"
          onClick={() => {
            edit(null);
          }}
        >
          {fichaAtencion.ajustes.ctaNueva}
        </Button>
      ) : null}

      {error ? (
        <p role="alert" className="text-13 text-ink">
          {error}
        </p>
      ) : null}
      {status ? (
        <p role="status" className="text-13 text-muted">
          {status}
        </p>
      ) : null}
    </Card>
  );
}
