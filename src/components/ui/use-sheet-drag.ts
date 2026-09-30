"use client";

// WP-47 (tillägg D): dra-för-att-stänga för bottenark på mobil (Radix `Dialog.Content`,
// `items-end`/`rounded-t-panel`-mönstret i manual-booking-dialog.tsx/move-dialog.tsx).
// Delad hook (i stället för en nära kopia i båda filerna, hård regel): bara ett vertikalt
// offset + en tröskel (dra tillräckligt långt ner → stäng, annars fjädrar arket tillbaka).
// Ingen fysiksimulering/kasthastighet — `vaul` (eller motsvarande) hade varit en ny
// dependency för samma sak, se WP-47-rapporten.
//
// Panelen flyttas imperativt via `panelRef.current.style.transform` (ren DOM-skrivning i en
// pointer-handler), inte via Reacts JSX `style`-prop: `src/components/**` tillåter bara
// `style={{ top/height/left/width }}` (D-021, se eslint.config.mjs) — `transform` skulle
// träffa den regeln, och offsetet ändras för ofta (varje pointermove) för att gå via
// re-render ändå.
import {
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from "react";

const CLOSE_THRESHOLD_PX = 96;

export type SheetDragHandleProps = {
  onPointerDown: (e: ReactPointerEvent<HTMLElement>) => void;
  onPointerMove: (e: ReactPointerEvent<HTMLElement>) => void;
  onPointerUp: (e: ReactPointerEvent<HTMLElement>) => void;
  onPointerCancel: (e: ReactPointerEvent<HTMLElement>) => void;
};

export type UseSheetDragResult = {
  /** Sätts på panelen (`Dialog.Content`) — offsetet skrivs till dess `style.transform`. */
  panelRef: React.RefObject<HTMLDivElement | null>;
  /** true medan ett drag pågår. */
  dragging: boolean;
  /** Spreadas på handtaget (en liten stapel överst i arket, `sm:hidden`). */
  handleProps: SheetDragHandleProps;
};

/** `onClose`: anropas (en gång) om draget passerar tröskeln vid `pointerup`. */
export function useSheetDrag(onClose: () => void): UseSheetDragResult {
  const panelRef = useRef<HTMLDivElement>(null);
  const startY = useRef<number | null>(null);
  const offset = useRef(0);
  const [dragging, setDragging] = useState(false);

  function setTransform(px: number) {
    const el = panelRef.current;
    if (!el) return;
    el.style.transform = px > 0 ? `translateY(${px}px)` : "";
    el.style.transition = px > 0 ? "none" : "";
  }

  function onPointerDown(e: ReactPointerEvent<HTMLElement>) {
    startY.current = e.clientY;
    setDragging(true);
    e.currentTarget.setPointerCapture(e.pointerId);
  }

  function onPointerMove(e: ReactPointerEvent<HTMLElement>) {
    if (startY.current == null) return;
    offset.current = Math.max(0, e.clientY - startY.current);
    setTransform(offset.current);
  }

  function end() {
    if (startY.current == null) return;
    startY.current = null;
    setDragging(false);
    const shouldClose = offset.current > CLOSE_THRESHOLD_PX;
    offset.current = 0;
    setTransform(0);
    if (shouldClose) onClose();
  }

  return {
    panelRef,
    dragging,
    handleProps: {
      onPointerDown,
      onPointerMove,
      onPointerUp: end,
      onPointerCancel: end,
    },
  };
}
