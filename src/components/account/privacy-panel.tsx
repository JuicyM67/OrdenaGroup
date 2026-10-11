"use client";

// WP-67 (D-054, Ley 21.719/GDPR): kundens integritet — erbjudande-samtycket
// (aldrig förkryssat; nuvarande val från servern), export som JSON-fil och
// radering med bekräftelseord. Server actions tas emot som props.
import { Download, Megaphone, Trash2, type LucideIcon } from "lucide-react";
import { useId, useState, type ReactNode } from "react";

import { TextField } from "@/components/ui/text-field";
import { comun, cuenta } from "@/i18n";

function Card({
  icon: Icon,
  tint,
  title,
  text,
  children,
}: {
  icon: LucideIcon;
  tint: string;
  title: string;
  text: string;
  children: ReactNode;
}) {
  return (
    <section className="flex flex-col gap-4 rounded-card bg-surface p-5">
      <div className="flex items-start gap-3">
        <span
          aria-hidden="true"
          className={`flex size-11 shrink-0 items-center justify-center rounded-full text-ink ${tint}`}
        >
          <Icon className="size-5" strokeWidth={2} />
        </span>
        <div className="flex flex-col gap-1">
          <h2 className="font-display text-20 font-semibold text-ink">
            {title}
          </h2>
          <p className="text-14 leading-body text-ink-soft">{text}</p>
        </div>
      </div>
      {children}
    </section>
  );
}

const btn =
  "flex h-11 items-center justify-center gap-2 self-start rounded-full px-5 text-14 font-bold transition-opacity duration-150 ease-out hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink disabled:opacity-40";

export function PrivacyPanel({
  marketingConsent,
  onSaveMarketing,
  onExport,
  onDelete,
}: {
  marketingConsent: boolean;
  onSaveMarketing: (granted: boolean) => Promise<{ ok: boolean }>;
  onExport: () => Promise<string | null>;
  onDelete: (word: string) => Promise<{ ok: false; code: "word" | "error" }>;
}) {
  const t = cuenta.privacidad;
  const [marketing, setMarketing] = useState(marketingConsent);
  const [saved, setSaved] = useState<"idle" | "saving" | "ok" | "error">(
    "idle",
  );
  const [exporting, setExporting] = useState(false);
  const [word, setWord] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<false | "word" | "error">(
    false,
  );
  const marketingId = useId();

  async function saveMarketing() {
    setSaved("saving");
    const r = await onSaveMarketing(marketing).catch(() => ({ ok: false }));
    setSaved(r.ok ? "ok" : "error");
  }

  async function exportData() {
    setExporting(true);
    try {
      const json = await onExport();
      if (json) {
        const url = URL.createObjectURL(
          new Blob([json], { type: "application/json" }),
        );
        const a = document.createElement("a");
        a.href = url;
        a.download = "mis-datos.json";
        a.click();
        URL.revokeObjectURL(url);
      }
    } finally {
      setExporting(false);
    }
  }

  async function remove() {
    setDeleteError(false);
    if (word.trim() !== t.palabra) {
      setDeleteError("word");
      return;
    }
    setDeleting(true);
    try {
      const r = await onDelete(word);
      if (!r.ok) setDeleteError(r.code);
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <Card
        icon={Megaphone}
        tint="bg-staff-1"
        title={t.marketingTitulo}
        text={t.marketingTexto}
      >
        <div className="flex items-start gap-2.5">
          <input
            id={marketingId}
            type="checkbox"
            checked={marketing}
            onChange={(e) => {
              setMarketing(e.target.checked);
              setSaved("idle");
            }}
            className="mt-0.5 size-5 shrink-0 accent-ink"
          />
          <label htmlFor={marketingId} className="text-14 text-ink">
            {t.marketingLabel}
          </label>
        </div>
        <div className="flex items-center gap-3">
          <button
            type="button"
            disabled={saved === "saving"}
            onClick={() => void saveMarketing()}
            className={`${btn} bg-ink text-surface`}
          >
            {t.marketingGuardar}
          </button>
          <p role="status" className="text-13 font-semibold text-ink">
            {saved === "ok" ? t.marketingGuardado : null}
            {saved === "error" ? comun.algoSalioMal : null}
          </p>
        </div>
      </Card>

      <Card
        icon={Download}
        tint="bg-staff-3"
        title={t.exportarTitulo}
        text={t.exportarTexto}
      >
        <button
          type="button"
          disabled={exporting}
          onClick={() => void exportData()}
          className={`${btn} bg-lime text-ink`}
        >
          <Download className="size-4" strokeWidth={2.25} aria-hidden="true" />
          {t.exportarCta}
        </button>
      </Card>

      <Card
        icon={Trash2}
        tint="bg-alert-bg"
        title={t.eliminarTitulo}
        text={t.eliminarTexto}
      >
        <form
          className="flex flex-col gap-3 fields-on-surface"
          onSubmit={(e) => {
            e.preventDefault();
            void remove();
          }}
        >
          <TextField
            label={t.eliminarLabel({ palabra: t.palabra })}
            value={word}
            autoComplete="off"
            onChange={(e) => setWord(e.target.value)}
            error={
              deleteError === "word"
                ? t.eliminarError
                : deleteError === "error"
                  ? comun.algoSalioMal
                  : undefined
            }
          />
          <button
            type="submit"
            disabled={deleting}
            className={`${btn} bg-alert text-surface`}
          >
            <Trash2 className="size-4" strokeWidth={2.25} aria-hidden="true" />
            {t.eliminarCta}
          </button>
        </form>
      </Card>
    </div>
  );
}
