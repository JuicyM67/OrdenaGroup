"use client";

// WP-84 (D-069, port av SE WP-90): "Rubro y ubicación" på /admin/negocios/[id]
// — rubro, comuna och dirección. En enda guardar-knapp; servern validerar och
// loggar ändringen.
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { TextField } from "@/components/ui/text-field";
import { adminPanel, negocio } from "@/i18n";

import type { AdminActionResult } from "./confirm-action-button";

const t = adminPanel.ubicacion;

type Rubro = keyof typeof negocio.rubros;
const RUBROS = Object.keys(negocio.rubros) as Rubro[];

export type AdminPlaceValue = {
  rubro: Rubro;
  comuna: string;
  address: string;
};

export function AdminPlaceForm({
  value,
  onSubmit,
}: {
  value: AdminPlaceValue;
  onSubmit: (input: AdminPlaceValue) => Promise<AdminActionResult>;
}) {
  const router = useRouter();
  const [rubro, setRubro] = useState<Rubro>(value.rubro);
  const [comuna, setComuna] = useState(value.comuna);
  const [address, setAddress] = useState(value.address);
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setPending(true);
    setMessage(null);
    const result = await onSubmit({ rubro, comuna, address });
    setPending(false);
    setMessage(result.ok ? t.guardado : t.error);
    if (result.ok) router.refresh();
  }

  return (
    <form
      onSubmit={(e) => void handleSubmit(e)}
      className="flex flex-col gap-4"
    >
      <p className="text-13 text-ink-soft">{t.intro}</p>
      <Select
        label={negocio.campos.categoryLabel}
        value={rubro}
        onChange={(e) => setRubro(e.target.value as Rubro)}
      >
        {RUBROS.map((id) => (
          <option key={id} value={id}>
            {negocio.rubros[id]}
          </option>
        ))}
      </Select>
      <TextField
        label={negocio.campos.comunaLabel}
        value={comuna}
        onChange={(e) => setComuna(e.target.value)}
        maxLength={80}
        required
      />
      <TextField
        label={negocio.campos.addressLabel}
        value={address}
        onChange={(e) => setAddress(e.target.value)}
        maxLength={200}
      />
      <div className="flex items-center gap-3">
        <Button type="submit" size="lg" disabled={pending}>
          {t.guardar}
        </Button>
        {message ? (
          <span role="status" className="text-13 text-ink-soft">
            {message}
          </span>
        ) : null}
      </div>
    </form>
  );
}
