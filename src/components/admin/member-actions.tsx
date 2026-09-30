"use client";

// Support-åtgärder per medlem (F19/WP-36): skicka ny inloggningslänk, byt
// e-post. Svensk text.
import { useState, type FormEvent } from "react";

import { Button } from "@/components/ui/button";
import { TextField } from "@/components/ui/text-field";
import type { AdminActionResult } from "./confirm-action-button";

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
    setLinkMsg(result.ok ? "Länk skickad." : `Det gick inte (${result.code}).`);
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
          {sendingLink ? "Skickar…" : "Skicka inloggningslänk"}
        </Button>
        <Button
          type="button"
          variant="secondary"
          size="xs"
          onClick={() => setEditing((v) => !v)}
        >
          Byt e-post
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
            label="Ny e-post"
            type="email"
            value={newEmail}
            onChange={(e) => setNewEmail(e.target.value)}
            error={emailError ? `Det gick inte (${emailError}).` : undefined}
          />
          <Button type="submit" size="xs" disabled={savingEmail}>
            {savingEmail ? "Sparar…" : "Spara"}
          </Button>
        </form>
      ) : null}
    </div>
  );
}
