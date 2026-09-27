/**
 * Tillståndsmaskin för Reserva (ren reducer, ingen data-import). Se
 * docs/tasks/plans/WP-13.md steg 1.
 *
 * Flödet: `seleccion` → `datos` → `confirmacion`. Väntelistan återanvänder samma tre
 * steg: `seleccion` (dagen full) → `datos` (formuläret utan pris) → `seleccion`
 * (kunden med, `waitlistJoined`). `confirmacion` nås bara via `submit_success` från
 * `datos` (aldrig direkt från `seleccion`).
 *
 * Byte av tjänst/profesional/dag rensar felet och avmarkerar väntelistan (`errorCode`,
 * `waitlistJoined`), eftersom ett nytt val gör det gamla felet/kortet inaktuellt.
 * Om dagen ska behållas vid tjänst-/profesionalbyte avgör anroparen (`keepDay`),
 * eftersom det kräver att slå upp tillgängligheten — reducern har ingen data.
 */
import type { LocalDate } from "@/lib/format/dates";

import type { BookingServerErrorCode } from "./types";

export interface BookingSelection {
  readonly serviceId: string | null;
  readonly staffId: string;
  readonly date: LocalDate | null;
  readonly slotId: string | null;
}

export type BookingStep = "seleccion" | "datos" | "confirmacion";

export interface BookingFlowState {
  readonly step: BookingStep;
  readonly selection: BookingSelection;
  readonly waitlistJoined: boolean;
  readonly formStatus: "idle" | "submitting";
  readonly errorCode: BookingServerErrorCode | null;
  /** Id:n som stubben svarat `slot_taken` på — tas bort ur listan i UI:t. */
  readonly removedSlotIds: readonly string[];
}

export const initialSelection: BookingSelection = {
  serviceId: null,
  staffId: "any",
  date: null,
  slotId: null,
};

export const initialFlowState: BookingFlowState = {
  step: "seleccion",
  selection: initialSelection,
  waitlistJoined: false,
  formStatus: "idle",
  errorCode: null,
  removedSlotIds: [],
};

export type BookingFlowAction =
  | { type: "select_service"; serviceId: string; keepDay: boolean }
  | { type: "select_staff"; staffId: string; keepDay: boolean }
  | { type: "select_day"; date: LocalDate }
  | { type: "select_slot"; slotId: string }
  | { type: "go_to_datos" }
  | { type: "go_back" }
  | { type: "submit_start" }
  | { type: "submit_success" }
  | { type: "submit_error"; code: BookingServerErrorCode }
  | { type: "join_waitlist_start" }
  | { type: "join_waitlist_success" }
  | { type: "join_waitlist_error"; code: BookingServerErrorCode };

/** Koder som skickar tillbaka kunden till valen (steg 3), med felraden ovanför tiderna. */
const SELECTION_ERROR_CODES = new Set<BookingServerErrorCode>([
  "slot_taken",
  "too_soon",
  "outside_hours",
]);

export function bookingFlowReducer(
  state: BookingFlowState,
  action: BookingFlowAction,
): BookingFlowState {
  switch (action.type) {
    case "select_service":
      return {
        ...state,
        selection: {
          ...state.selection,
          serviceId: action.serviceId,
          date: action.keepDay ? state.selection.date : null,
          slotId: null,
        },
        waitlistJoined: false,
        errorCode: null,
      };
    case "select_staff":
      return {
        ...state,
        selection: {
          ...state.selection,
          staffId: action.staffId,
          date: action.keepDay ? state.selection.date : null,
          slotId: null,
        },
        waitlistJoined: false,
        errorCode: null,
      };
    case "select_day":
      return {
        ...state,
        selection: { ...state.selection, date: action.date, slotId: null },
        waitlistJoined: false,
        errorCode: null,
      };
    case "select_slot":
      return {
        ...state,
        selection: { ...state.selection, slotId: action.slotId },
      };
    case "go_to_datos":
      return { ...state, step: "datos", errorCode: null };
    case "go_back":
      return { ...state, step: "seleccion", formStatus: "idle" };
    case "submit_start":
      return { ...state, formStatus: "submitting", errorCode: null };
    case "submit_success":
      // Bekräftelsen nås bara från datos-steget, aldrig direkt från valen.
      if (state.step !== "datos") return state;
      return { ...state, step: "confirmacion", formStatus: "idle" };
    case "submit_error": {
      if (!SELECTION_ERROR_CODES.has(action.code)) {
        return { ...state, formStatus: "idle", errorCode: action.code };
      }
      const takenSlotId = state.selection.slotId;
      return {
        ...state,
        step: "seleccion",
        formStatus: "idle",
        errorCode: action.code,
        selection: { ...state.selection, slotId: null },
        removedSlotIds:
          action.code === "slot_taken" && takenSlotId
            ? [...state.removedSlotIds, takenSlotId]
            : state.removedSlotIds,
      };
    }
    case "join_waitlist_start":
      return { ...state, formStatus: "submitting", errorCode: null };
    case "join_waitlist_success":
      return {
        ...state,
        step: "seleccion",
        formStatus: "idle",
        waitlistJoined: true,
        errorCode: null,
      };
    case "join_waitlist_error": {
      if (action.code === "waitlist_duplicate") {
        return {
          ...state,
          step: "seleccion",
          formStatus: "idle",
          waitlistJoined: true,
          errorCode: action.code,
        };
      }
      return { ...state, formStatus: "idle", errorCode: action.code };
    }
  }
}

/** `canContinue`: tjänst + dag + tid, eller tjänst + full dag (väntelistan). */
export function canContinue(
  selection: BookingSelection,
  dayIsFull: boolean,
): boolean {
  if (!selection.serviceId || !selection.date) return false;
  if (dayIsFull) return true;
  return !!selection.slotId;
}
