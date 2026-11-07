"use client";

// Generisk bekräftelseknapp för känsliga /admin-åtgärder (frys/radera,
// F19/WP-36): återanvänder `ConfirmDialog` (WP-26). Text via `adminPanel`.
import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button, type ButtonProps } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { adminPanel } from "@/i18n";

import { actionErrorText } from "./admin-error-text";

export type AdminActionResult = { ok: true } | { ok: false; code: string };

export type ConfirmActionButtonProps = {
  label: string;
  title: string;
  body: string;
  confirmLabel: string;
  cancelLabel?: string;
  variant?: ButtonProps["variant"];
  action: () => Promise<AdminActionResult>;
  /** WP-80: översätter felkoden (standard: `actionErrorText`). */
  errorText?: (code: string) => string;
};

export function ConfirmActionButton({
  label,
  title,
  body,
  confirmLabel,
  cancelLabel = adminPanel.confirmar.cancelar,
  variant = "secondary",
  action,
  errorText = actionErrorText,
}: ConfirmActionButtonProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleConfirm() {
    const result = await action();
    if (result.ok) {
      setOpen(false);
      router.refresh();
    } else {
      setError(result.code);
    }
  }

  return (
    <>
      <Button
        type="button"
        variant={variant}
        size="sm"
        onClick={() => setOpen(true)}
      >
        {label}
      </Button>
      <ConfirmDialog
        open={open}
        onOpenChange={(next) => {
          setOpen(next);
          if (!next) setError(null);
        }}
        title={title}
        body={
          <>
            {body}
            {error ? (
              <span className="mt-2 block text-13 text-alert">
                {errorText(error)}
              </span>
            ) : null}
          </>
        }
        confirmLabel={confirmLabel}
        cancelLabel={cancelLabel}
        onConfirm={handleConfirm}
      />
    </>
  );
}
