"use client";

// Generisk bekräftelseknapp för känsliga /admin-åtgärder (frys/radera,
// F19/WP-36): återanvänder `ConfirmDialog` (WP-26). Svensk text.
import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button, type ButtonProps } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";

export type AdminActionResult = { ok: true } | { ok: false; code: string };

export type ConfirmActionButtonProps = {
  label: string;
  title: string;
  body: string;
  confirmLabel: string;
  cancelLabel?: string;
  variant?: ButtonProps["variant"];
  action: () => Promise<AdminActionResult>;
  /** WP-80: översätter felkoden (standard: "Det gick inte (kod)"). */
  errorText?: (code: string) => string;
};

export function ConfirmActionButton({
  label,
  title,
  body,
  confirmLabel,
  cancelLabel = "Avbryt",
  variant = "secondary",
  action,
  errorText,
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
                {errorText ? errorText(error) : `Det gick inte (${error}).`}
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
