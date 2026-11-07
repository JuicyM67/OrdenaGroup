"use client";

// Support-åtgärder per medlem (F19/WP-36): skicka ny inloggningslänk, byt
// e-post. Text via `adminPanel.miembro`.
import { useState, type FormEvent } from "react";

import { Button } from "@/components/ui/button";
import { TextField } from "@/components/ui/text-field";
import { adminPanel } from "@/i18n";

import { actionErrorText } from "./admin-error-text";
import type { AdminActionResult } from "./confirm-action-button";

const t = adminPanel.miembro;

export type MemberActionsProps = {
  onSendLoginLink: () => Promise<AdminActionResult>;
  onChangeEmail: (newEmail: string) => Promise<AdminActionResult>;
};

export function MemberActions({
  onSendLoginLink,
  onChangeEmail,
}: MemberActionsProps) {
  const [sendingLink, setSendingLink] = useState(false);
  const [linkMsg, setLinkMsg] = useState<string | null>(null);

  const [editing, setEditing] = useState(false);
  const [newEmail, setNewEmail] = useState("");
  const [savingEmail, setSavingEmail] = useState(false);
  const [emailError, setEmailError] = useState<string | null>(null);

  async function handleSendLink() {
    setSendingLink(true);
    setLinkMsg(null);
    const result = await onSendLoginLink();
    setSendingLink(false);
    setLinkMsg(result.ok ? t.enlaceEnviado : actionErrorText(result.code));
  }

  async function handleChangeEmail(e: FormEvent) {
    e.preventDefault();
    setSavingEmail(true);
    setEmailError(null);
    const result = await onChangeEmail(newEmail);
    setSavingEmail(false);
    if (result.ok) {
      setEditing(false);
      setNewEmail("");
    } else {
      setEmailError(result.code);
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2">
        <Button
          type="button"
          variant="secondary"
          size="xs"
          disabled={sendingLink}
          onClick={() => void handleSendLink()}
        >
          {sendingLink ? t.enviando : t.enviarEnlace}
        </Button>
        <Button
          type="button"
          variant="secondary"
          size="xs"
          onClick={() => setEditing((v) => !v)}
        >
          {t.cambiarCorreo}
        </Button>
      </div>
      {linkMsg ? (
        <span className="text-12 text-ink-soft">{linkMsg}</span>
      ) : null}
      {editing ? (
        <form
          onSubmit={(e) => void handleChangeEmail(e)}
          className="flex items-end gap-2"
        >
          <TextField
            label={t.correoNuevo}
            type="email"
            value={newEmail}
            onChange={(e) => setNewEmail(e.target.value)}
            error={emailError ? actionErrorText(emailError) : undefined}
          />
          <Button type="submit" size="xs" disabled={savingEmail}>
            {savingEmail ? t.guardando : t.guardar}
          </Button>
        </form>
      ) : null}
    </div>
  );
}
