// Guidad visning (WP-72): spotlight som glider mellan mål på sidan, infokort i
// ljust liquid glass, stegräknare, progress-segment, "Hoppa över" och en liten
// "Visa mig runt igen"-knapp efteråt. Källa: docs/design/reference/visning/*.dc.html.
//
// Generisk: målen pekas ut med `data-tour="<namn>"` på riktiga element (sidan eller en
// statisk mockup) och mäts med getBoundingClientRect, så samma motor driver både
// kundvyn (/[slug]) och företagsvyn. Laddas alltid som lazy chunk (`next/dynamic`,
// ssr:false) så den inte räknas in i sidans JS-budget (D-039).
"use client";

import { ArrowRight, CalendarCheck, Check } from "lucide-react";
import {
  type KeyboardEvent,
  type ReactNode,
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";

import { cn } from "@/components/ui/cn";

export interface TourStep {
  readonly id: string;
  /** `data-tour`-namn i prioritetsordning; första som syns (har storlek) används. */
  readonly targets: readonly string[];
  readonly title: string;
  readonly text: string;
  /** Kortare text för små skärmar. */
  readonly compactText?: string;
  readonly chips: readonly string[];
}

export interface TourCopy {
  readonly skip: string;
  readonly back: string;
  readonly next: string;
  readonly restart: string;
  readonly progress: string;
  readonly counter: (n: number, total: number) => string;
}

export interface TourWelcome {
  readonly aria: string;
  readonly title: string;
  readonly text: string;
  readonly start: string;
  readonly skip: string;
  readonly pills?: {
    readonly label: string;
    readonly items: readonly { id: string; label: string }[];
  };
}

export interface TourDoneApi {
  readonly industry: string | null;
  readonly close: () => void;
}

export interface GuidedTourProps {
  readonly steps: readonly TourStep[];
  readonly copy: TourCopy;
  readonly welcome: TourWelcome;
  readonly renderDone: (api: TourDoneApi) => ReactNode;
  /** sessionStorage-nyckel: "visning stängd" så den inte startar om vid navigering. */
  readonly storageKey: string;
  /** aria-label för avslutsdialogen. */
  readonly doneAria: string;
  /** Anropas med aktivt stegs id (eller null utanför stegen), t.ex. för att byta flik. */
  readonly onStepChange?: (id: string | null) => void;
  /** Placering av "Visa mig runt igen" (klasser för position). */
  readonly restartClassName?: string;
}

interface Box {
  readonly x: number;
  readonly y: number;
  readonly w: number;
  readonly h: number;
}

const PAD = 8;
const CARD_W = 380;
const GAP = 16;
const MOBILE_MAX = 1023;

function readDismissed(key: string): boolean {
  try {
    return window.sessionStorage.getItem(key) === "1";
  } catch {
    return false;
  }
}
function writeDismissed(key: string): void {
  try {
    window.sessionStorage.setItem(key, "1");
  } catch {
    // Privat läge utan lagring: visningen startar bara om vid nästa laddning.
  }
}

function findTarget(targets: readonly string[]): HTMLElement | null {
  for (const t of targets) {
    const all = document.querySelectorAll<HTMLElement>(`[data-tour="${t}"]`);
    for (const el of all) {
      const r = el.getBoundingClientRect();
      if (r.width > 0 && r.height > 0) return el;
    }
  }
  return null;
}

/** Fokuserbara element i dialogen (länkar och knappar räcker här). */
function focusables(root: HTMLElement): HTMLElement[] {
  return [...root.querySelectorAll<HTMLElement>("a, button")].filter(
    (el) => !el.hasAttribute("disabled"),
  );
}

/** Finns något av målen i DOM:en (även dolda, t.ex. en annan flik eller bredd)? */
function hasTarget(step: TourStep): boolean {
  return step.targets.some(
    (t) => document.querySelector(`[data-tour="${t}"]`) !== null,
  );
}

export function GuidedTour({
  steps: allSteps,
  copy,
  welcome,
  renderDone,
  storageKey,
  doneAria,
  onStepChange,
  restartClassName,
}: GuidedTourProps) {
  // Steg utan mål på sidan (t.ex. omdömen när företaget inte har några) hoppas över.
  const [steps] = useState<readonly TourStep[]>(() =>
    allSteps.filter(hasTarget),
  );
  const total = steps.length;
  const doneIdx = total + 1;
  const offIdx = total + 2;

  const [phase, setPhase] = useState<number>(() =>
    readDismissed(storageKey) ? offIdx : 0,
  );
  const [industry, setIndustry] = useState<string | null>(
    welcome.pills?.items[0]?.id ?? null,
  );
  const [measured, setBox] = useState<Box | null>(null);
  const [vp, setVp] = useState<{ w: number; h: number }>(() => ({
    w: window.innerWidth,
    h: window.innerHeight,
  }));
  const [cardH, setCardH] = useState(280);
  const [scrolling, setScrolling] = useState(false);
  const dialogRef = useRef<HTMLDivElement>(null);
  const restartRef = useRef<HTMLButtonElement>(null);
  const prevPhase = useRef(phase);

  const step = phase >= 1 && phase <= total ? steps[phase - 1]! : null;
  const box = step ? measured : null;
  const isOff = phase === offIdx;
  const compact = vp.w <= MOBILE_MAX;

  const finish = useCallback(() => {
    writeDismissed(storageKey);
    setPhase(offIdx);
  }, [offIdx, storageKey]);
  const next = useCallback(() => {
    setPhase((p) => Math.min(doneIdx, p + 1));
  }, [doneIdx]);
  const back = useCallback(() => {
    setPhase((p) => Math.max(0, p - 1));
  }, []);

  // Markera sidan som "i visningsläge" (visar t.ex. betalningsraden, tour-note).
  useEffect(() => {
    const root = document.documentElement;
    if (isOff) root.removeAttribute("data-tour-on");
    else root.setAttribute("data-tour-on", "");
    return () => {
      root.removeAttribute("data-tour-on");
    };
  }, [isOff]);

  useEffect(() => {
    onStepChange?.(step ? step.id : null);
  }, [step, onStepChange]);

  // Mät målet: rulla in det, mät, och gör om några bildrutor tills det finns (flikbyte).
  const measure = useCallback(() => {
    if (!step) return null;
    const el = findTarget(step.targets);
    if (!el) return null;
    const r = el.getBoundingClientRect();
    return { x: r.left, y: r.top, w: r.width, h: r.height };
  }, [step]);

  useEffect(() => {
    if (!step) return;
    let frames = 0;
    let raf = 0;
    let scrolled = false;
    const tick = () => {
      const el = findTarget(step.targets);
      if (el && !scrolled) {
        scrolled = true;
        const r = el.getBoundingClientRect();
        const vh = window.innerHeight;
        const region = compact ? vh - cardH - GAP * 2 : vh;
        const wanted = r.height > region * 0.9 ? 96 : (region - r.height) / 2;
        const delta = r.top - Math.max(GAP, wanted);
        if (Math.abs(delta) > 4) window.scrollBy({ top: delta });
      }
      const m = measure();
      if (m) setBox(m);
      else if (frames < 12) {
        frames += 1;
        raf = requestAnimationFrame(tick);
        return;
      } else setBox(null);
    };
    raf = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(raf);
    };
    // cardH ändras bara av mätningen nedan; ett nytt steg räcker som trigger.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, compact]);

  // Följ scroll/resize utan att spotlighten hinkar efter (tillfälligt utan glid).
  useEffect(() => {
    if (!step) return;
    let timer = 0;
    let raf = 0;
    const onMove = () => {
      setScrolling(true);
      window.clearTimeout(timer);
      timer = window.setTimeout(() => {
        setScrolling(false);
      }, 160);
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        setVp({ w: window.innerWidth, h: window.innerHeight });
        const m = measure();
        if (m) setBox(m);
      });
    };
    window.addEventListener("scroll", onMove, { passive: true });
    window.addEventListener("resize", onMove);
    return () => {
      window.removeEventListener("scroll", onMove);
      window.removeEventListener("resize", onMove);
      window.clearTimeout(timer);
      cancelAnimationFrame(raf);
    };
  }, [step, measure]);

  // Kortets höjd (för placering) och fokus på primärknappen vid varje fas.
  useLayoutEffect(() => {
    if (dialogRef.current) setCardH(dialogRef.current.offsetHeight);
  }, [phase, box, industry]);

  useEffect(() => {
    if (isOff) {
      if (prevPhase.current !== offIdx) restartRef.current?.focus();
    } else {
      if (dialogRef.current) {
        focusables(dialogRef.current)
          .find((el) => el.dataset.autofocus !== undefined)
          ?.focus({ preventScroll: true });
      }
    }
    prevPhase.current = phase;
  }, [phase, isOff, offIdx]);

  function onKeyDown(e: KeyboardEvent<HTMLDivElement>) {
    if (e.key === "Escape") {
      e.stopPropagation();
      finish();
      return;
    }
    if (e.key === "Tab" && dialogRef.current) {
      const items = focusables(dialogRef.current);
      if (items.length === 0) return;
      const first = items[0]!;
      const last = items[items.length - 1]!;
      const active = document.activeElement;
      if (e.shiftKey && active === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && active === last) {
        e.preventDefault();
        first.focus();
      }
    }
    if (step && e.target instanceof HTMLElement && e.target.tagName !== "A") {
      if (e.key === "ArrowRight") next();
      if (e.key === "ArrowLeft") back();
    }
  }

  // ---- Restart-knapp (efter avslut) ----
  if (isOff) {
    return (
      <button
        ref={restartRef}
        type="button"
        onClick={() => {
          setPhase(0);
        }}
        className={cn(
          "fixed z-80 flex h-12 animate-tour-in items-center gap-2 rounded-full px-4.5 font-bold tour-glass focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink",
          restartClassName ?? "bottom-6 left-6",
        )}
      >
        <span
          aria-hidden="true"
          className="flex size-6.5 items-center justify-center rounded-full bg-lime text-13 text-ink"
        >
          ?
        </span>
        {copy.restart}
      </button>
    );
  }

  // ---- Spotlight ----
  const centre = { x: vp.w / 2, y: vp.h / 2, w: 0, h: 0 };
  const spot: Box =
    step && box
      ? {
          x: box.x - PAD,
          y: box.y - PAD,
          w: box.w + PAD * 2,
          h: box.h + PAD * 2,
        }
      : centre;

  // ---- Kortplacering ----
  let cardPos: { left?: number; top?: number } = {};
  let cardClass = "";
  if (step && compact) {
    const atTop = box ? box.y + box.h / 2 > vp.h * 0.55 : false;
    cardClass = cn("inset-x-3", atTop ? "top-3" : "bottom-3");
  } else if (step) {
    const h = cardH;
    const fits = (x: number) => x >= GAP && x + CARD_W <= vp.w - GAP;
    const clampY = (y: number) =>
      Math.min(Math.max(GAP, y), Math.max(GAP, vp.h - h - GAP));
    let x = vp.w - CARD_W - GAP * 2;
    let y = GAP * 2;
    if (box) {
      const right = spot.x + spot.w + GAP;
      const left = spot.x - GAP - CARD_W;
      if (fits(right)) {
        x = right;
        y = clampY(spot.y);
      } else if (fits(left)) {
        x = left;
        y = clampY(spot.y);
      } else if (spot.y + spot.h + GAP + h <= vp.h - GAP) {
        x = Math.min(Math.max(GAP, spot.x), vp.w - CARD_W - GAP);
        y = spot.y + spot.h + GAP;
      } else if (spot.y - GAP - h >= GAP) {
        x = Math.min(Math.max(GAP, spot.x), vp.w - CARD_W - GAP);
        y = spot.y - GAP - h;
      } else {
        y = clampY(spot.y);
        x = spot.x + spot.w / 2 > vp.w / 2 ? GAP * 2 : vp.w - CARD_W - GAP * 2;
      }
    }
    cardPos = { left: x, top: y };
  }

  return (
    <>
      {/* Spärrar klick på sidan bakom medan visningen pågår. */}
      <div aria-hidden="true" className="fixed inset-0 z-70" />
      <div
        aria-hidden="true"
        className={cn(
          "tour-spot rounded-card",
          step && box && "animate-tour-ring",
          scrolling && "tour-spot-still",
        )}
        style={{ left: spot.x, top: spot.y, width: spot.w, height: spot.h }}
      />

      {phase === 0 ? (
        <div className="fixed inset-0 z-80 flex items-center justify-center p-4">
          <div
            ref={dialogRef}
            role="dialog"
            aria-modal="true"
            aria-label={welcome.aria}
            onKeyDown={onKeyDown}
            className="flex max-h-full w-full max-w-125 animate-tour-in flex-col items-center gap-4.5 overflow-y-auto rounded-shell p-6 text-center tour-glass sm:p-8"
          >
            <span
              aria-hidden="true"
              className="flex size-16 items-center justify-center rounded-full bg-staff-1 text-ink"
            >
              <CalendarCheck className="size-7" strokeWidth={2} />
            </span>
            <h2 className="font-display text-30 leading-snug font-semibold">
              {welcome.title}
            </h2>
            <p className="text-15 leading-relaxed text-muted">{welcome.text}</p>
            {welcome.pills ? (
              <div
                role="group"
                aria-label={welcome.pills.label}
                className="flex flex-wrap justify-center gap-2"
              >
                {welcome.pills.items.map((it) => {
                  const on = it.id === industry;
                  return (
                    <button
                      key={it.id}
                      type="button"
                      aria-pressed={on}
                      onClick={() => {
                        setIndustry(it.id);
                      }}
                      className={cn(
                        "inline-flex h-8.5 items-center rounded-full px-3 text-13 font-semibold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink",
                        on
                          ? "bg-lime text-ink"
                          : "border-2 border-dashed border-ink/25 bg-surface/60 text-muted",
                      )}
                    >
                      {it.label}
                    </button>
                  );
                })}
              </div>
            ) : null}
            <div className="mt-1 flex items-center gap-2.5">
              <button
                type="button"
                onClick={finish}
                className="h-12 rounded-full px-4.5 font-bold text-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
              >
                {welcome.skip}
              </button>
              <button
                type="button"
                data-autofocus
                onClick={next}
                className="flex h-13 items-center gap-3 rounded-full bg-ink pr-2 pl-5.5 text-15 font-bold text-on-dark focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
              >
                {welcome.start}
                <span
                  aria-hidden="true"
                  className="flex size-9.5 items-center justify-center rounded-full bg-surface/20"
                >
                  <ArrowRight className="size-4.5" strokeWidth={2.5} />
                </span>
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {step ? (
        <div
          ref={dialogRef}
          role="dialog"
          aria-modal="true"
          aria-label={step.title}
          onKeyDown={onKeyDown}
          className={cn(
            "fixed z-80 flex animate-tour-in flex-col gap-3.5 rounded-hero p-4.5 tour-glass sm:p-5.5",
            compact ? cardClass : "w-95",
          )}
          style={{ left: cardPos.left, top: cardPos.top }}
        >
          <div className="flex items-center justify-between">
            <span className="text-12 font-bold tracking-caps text-muted">
              {copy.counter(phase, total)}
            </span>
            <button
              type="button"
              onClick={finish}
              className="text-13 font-semibold text-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
            >
              {copy.skip}
            </button>
          </div>
          <div
            role="progressbar"
            aria-label={copy.progress}
            aria-valuemin={1}
            aria-valuemax={total}
            aria-valuenow={phase}
            className="flex gap-1"
          >
            {steps.map((s, i) => (
              <span
                key={s.id}
                className={cn(
                  "h-1.25 flex-1 rounded-tag",
                  i < phase ? "bg-lilac" : "bg-ink/10",
                )}
              />
            ))}
          </div>
          <h2 className="font-display text-22 leading-snug font-semibold sm:text-24">
            {step.title}
          </h2>
          <p className="text-14 leading-relaxed text-muted">
            {compact && step.compactText ? step.compactText : step.text}
          </p>
          <div className="flex flex-wrap gap-1.5">
            {step.chips.map((c) => (
              <span
                key={c}
                className="inline-flex h-8 items-center gap-1.5 rounded-full bg-lime px-2.75 text-12 font-semibold text-ink"
              >
                <Check aria-hidden="true" className="size-3" strokeWidth={3} />
                {c}
              </span>
            ))}
          </div>
          <div className="mt-1 flex items-center justify-between">
            <button
              type="button"
              onClick={back}
              className="h-11 rounded-full border-2 border-ink/15 bg-surface/60 px-4 font-bold text-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
            >
              {copy.back}
            </button>
            <button
              type="button"
              data-autofocus
              aria-label={copy.next}
              onClick={next}
              className="flex size-13 items-center justify-center rounded-full bg-ink text-on-dark focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
            >
              <ArrowRight
                aria-hidden="true"
                className="size-5"
                strokeWidth={2.5}
              />
            </button>
          </div>
        </div>
      ) : null}

      {phase === doneIdx ? (
        <div className="fixed inset-0 z-80 flex items-end justify-center overflow-y-auto p-3 sm:items-center sm:p-4">
          <div
            ref={dialogRef}
            role="dialog"
            aria-modal="true"
            aria-label={doneAria}
            onKeyDown={onKeyDown}
            className="w-full max-w-140 animate-tour-in"
          >
            {renderDone({ industry, close: finish })}
          </div>
        </div>
      ) : null}
    </>
  );
}
