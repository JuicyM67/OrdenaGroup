// WP-24 (F10) · "Enkla staplar med tokens, ingen ny dependency" (planen §Caja
// e informes). `style={{ width/height }}` är den enda geometrin (D-021,
// eslint.config.mjs tillåter bara top/height/left/width som objekt-literal i
// src/components/**) — färg/radie/text kommer alltid från tokens/Tailwind-
// klasser, aldrig ur `style`.
import { cn } from "../ui/cn";

function pct(value: number, max: number): number {
  if (max <= 0) return 0;
  return Math.max(0, Math.min(100, Math.round((value / max) * 100)));
}

// ---------------------------------------------------------------------------
// ShareBarList — rader med en horisontell stapel (fördelningar, beläggning)
// ---------------------------------------------------------------------------

export type ShareBarRow = {
  key: string;
  label: string;
  trailing: string;
  /** 0–100, redan uträknat av anroparen (jämförs mot olika saker beroende på
   * sammanhang: störst i listan för fördelningar, tillgänglig tid för
   * beläggning). */
  pct: number;
};

export function ShareBarList({
  rows,
  emptyLabel,
}: {
  rows: readonly ShareBarRow[];
  emptyLabel: string;
}) {
  if (rows.length === 0) {
    return <p className="text-13 text-muted">{emptyLabel}</p>;
  }
  return (
    <div className="flex flex-col gap-3">
      {rows.map((row) => (
        <div key={row.key} className="flex flex-col gap-1.5">
          <div className="flex items-baseline justify-between gap-2 text-13">
            <span className="min-w-0 truncate font-semibold text-ink">
              {row.label}
            </span>
            <span className="shrink-0 text-muted">{row.trailing}</span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-canvas">
            <div
              className="h-full rounded-full bg-ink"
              style={{ width: `${row.pct}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

/** `amountMinor`/`bookings` (BreakdownRow-liknande) → `ShareBarRow`, stapeln
 * jämför mot största raden i listan. */
export function toShareBarRows(
  items: readonly { key: string; label: string; amountMinor: number }[],
  formatValue: (amountMinor: number) => string,
): ShareBarRow[] {
  const max = Math.max(0, ...items.map((i) => i.amountMinor));
  return items.map((i) => ({
    key: i.key,
    label: i.label,
    trailing: formatValue(i.amountMinor),
    pct: pct(i.amountMinor, max),
  }));
}

// ---------------------------------------------------------------------------
// WeekBars — en stapel per vecka (Ingresos por semana, Tendencia de inasistencias)
// ---------------------------------------------------------------------------

export type WeekBar = {
  key: string;
  /** "S38" eller liknande kort etikett under stapeln. */
  shortLabel: string;
  /** 0–100. */
  pct: number;
  /** Fullständig etikett för `aria-label`/`title` (vecka + värde). */
  title: string;
};

export function WeekBars({
  bars,
  emptyLabel,
}: {
  bars: readonly WeekBar[];
  emptyLabel: string;
}) {
  if (bars.length === 0) {
    return <p className="text-13 text-muted">{emptyLabel}</p>;
  }
  return (
    <div className="flex h-32 items-end gap-1">
      {bars.map((b) => (
        <div
          key={b.key}
          title={b.title}
          className="flex h-full flex-1 flex-col items-center justify-end gap-1.5"
        >
          <div className="flex h-24 w-full items-end overflow-hidden rounded-tag bg-canvas">
            <div
              className="w-full rounded-tag bg-ink"
              style={{ height: `${Math.max(b.pct, b.pct > 0 ? 4 : 0)}%` }}
            />
          </div>
          <span className="text-10 font-semibold text-muted">
            {b.shortLabel}
          </span>
        </div>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// StackedWeekBars — två serier per vecka (Clientes nuevos y recurrentes)
// ---------------------------------------------------------------------------

export type StackedWeekBar = {
  key: string;
  shortLabel: string;
  title: string;
  /** 0–100 vardera, summan får vara > 100 (klipps visuellt). */
  primaryPct: number;
  secondaryPct: number;
};

export function StackedWeekBars({
  bars,
  primaryLabel,
  secondaryLabel,
  emptyLabel,
}: {
  bars: readonly StackedWeekBar[];
  primaryLabel: string;
  secondaryLabel: string;
  emptyLabel: string;
}) {
  if (bars.length === 0) {
    return <p className="text-13 text-muted">{emptyLabel}</p>;
  }
  return (
    <div className="flex flex-col gap-3">
      <div className="flex h-32 items-end gap-1">
        {bars.map((b) => (
          <div
            key={b.key}
            title={b.title}
            className="flex h-full flex-1 flex-col items-end justify-end gap-1.5"
          >
            <div className="flex h-24 w-full flex-col items-stretch justify-end overflow-hidden rounded-tag bg-canvas">
              <div
                className="w-full bg-lilac"
                style={{ height: `${Math.min(100, b.secondaryPct)}%` }}
              />
              <div
                className="w-full rounded-t-tag bg-ink"
                style={{ height: `${Math.min(100, b.primaryPct)}%` }}
              />
            </div>
            <span className="text-10 font-semibold text-muted">
              {b.shortLabel}
            </span>
          </div>
        ))}
      </div>
      <div className="flex items-center gap-4 text-12 font-semibold text-muted">
        <span className="flex items-center gap-1.5">
          <span aria-hidden="true" className="size-2.5 rounded-full bg-ink" />
          {primaryLabel}
        </span>
        <span className="flex items-center gap-1.5">
          <span aria-hidden="true" className="size-2.5 rounded-full bg-lilac" />
          {secondaryLabel}
        </span>
      </div>
    </div>
  );
}

export function ChartCardTitle({
  title,
  subtitle,
  className,
}: {
  title: string;
  subtitle?: string;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col gap-0.5", className)}>
      <h3 className="text-15 font-bold text-ink">{title}</h3>
      {subtitle ? <p className="text-12 text-muted">{subtitle}</p> : null}
    </div>
  );
}
