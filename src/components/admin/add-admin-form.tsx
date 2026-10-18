"use client";

// WP-80 (D-061): "Agregar administrador" (e-post). Servern avgör om kontot
// finns, skapar det annars och skickar inloggningslänken.
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

import type { AdminMutationResult } from "@/app/(admin)/admin/administradores/actions";
import { Button } from "@/components/ui/button";
import { TextField } from "@/components/ui/text-field";
import { adminPanel } from "@/i18n";

import { adminErrorText } from "./admin-error-text";

const t = adminPanel.administradores;

export function AddAdminForm({
  onSubmit,
}: {
  onSubmit: (email: string) => Promise<AdminMutationResult>;
}) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<{
    kind: "ok" | "error";
    text: string;
  } | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setPending(true);
    setMessage(null);
    const result = await onSubmit(email);
    setPending(false);
    if (result.ok) {
      setEmail("");
      setMessage({
        kind: "ok",
        text: result.emailSent === false ? t.agregadoSinCorreo : t.agregado,
      });
      router.refresh();
    } else {
      setMessage({ kind: "error", text: adminErrorText(result.code) });
    }
  }

  return (
    <form
      onSubmit={(e) => void handleSubmit(e)}
      className="flex flex-col gap-3"
    >
      <TextField
        label={t.correo}
        type="email"
        required
        value={email}
        onChange={(e) => setEmail(e.target.value)}
      />
      {message ? (
        <p
          role="status"
          className={
            message.kind === "ok" ? "text-13 text-ink" : "text-13 text-alert"
          }
        >
          {message.text}
        </p>
      ) : null}
      <Button type="submit" size="md" disabled={pending} className="self-start">
        {pending ? t.agregando : t.agregar}
      </Button>
    </form>
  );
}
