"use client";

// Botón "Continuar con mi correo" (F19/WP-36): no pide nada, el correo ya lo
// sabe el servidor (la invitación lo tiene) — solo confirma el envío del
// link mágico. Mismo lenguaje visual que `LoginForm` (WP-15), sin campo de
// texto porque no hace falta.
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { invitacionNegocio } from "@/i18n/auth";

import type { SendInvitationLinkResult } from "./actions";
import { invitationErrorText } from "./error-text";

type Estado =
  | { fase: "idle" }
  | { fase: "enviando" }
  | { fase: "enviado"; email: string }
  | { fase: "error"; code: string };

export type InvitationFormProps = {
  token: string;
  businessName: string;
  onSend: (token: string) => Promise<SendInvitationLinkResult>;
};

export function InvitationForm({
  token,
  businessName,
  onSend,
}: InvitationFormProps) {
  const [estado, setEstado] = useState<Estado>({ fase: "idle" });

  async function handleClick() {
    setEstado({ fase: "enviando" });
    try {
      const result = await onSend(token);
      if (result.ok) setEstado({ fase: "enviado", email: result.email });
      else setEstado({ fase: "error", code: result.code });
    } catch {
      setEstado({ fase: "error", code: "network" });
    }
  }

  if (estado.fase === "enviado") {
    return (
      <Card radius="card" padding="xl" className="flex flex-col gap-3">
        <h1 className="text-22 font-bold tracking-title text-ink">
          {invitacionNegocio.titulo}
        </h1>
        <p className="text-15 text-ink-soft">
          {invitacionNegocio.enviado({ email: estado.email })}
        </p>
      </Card>
    );
  }

  const enviando = estado.fase === "enviando";

  return (
    <Card radius="card" padding="xl" className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <h1 className="text-22 font-bold tracking-title text-ink">
          {invitacionNegocio.titulo}
        </h1>
        <p className="text-13 text-muted">{businessName}</p>
      </div>
      {estado.fase === "error" ? (
        <p className="text-13 text-alert">{invitationErrorText(estado.code)}</p>
      ) : null}
      <Button
        type="button"
        size="xl"
        disabled={enviando}
        onClick={() => {
          void handleClick();
        }}
      >
        {enviando ? invitacionNegocio.enviando : invitacionNegocio.continuarCta}
      </Button>
    </Card>
  );
}
