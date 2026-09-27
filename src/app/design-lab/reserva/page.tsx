// /design-lab/reserva — artboard 390×1060, `?estado=` väljer tillstånden i planens
// steg 8. Standardläget (utan `?estado=`) är referensens: Corte + barba, Cualquiera,
// Mar 6, 11:30 flash. Alla lägen är interaktiva (samma BookingScreen/actions som den
// riktiga routen), inte bara stillbilder.
import { errores } from "@/i18n";

import {
  BookingScreen,
  type BookingScreenProps,
} from "@/components/booking/booking-screen";
import type { BookingFlowState } from "@/components/booking/flow-state";
import type {
  CustomerFormOutput,
  WaitlistFormOutput,
} from "@/components/booking/form-schema";
import type {
  BookingActionResult,
  BookingPageData,
} from "@/components/booking/types";

import { createBookingAction, joinWaitlistAction } from "../../[slug]/actions";
import {
  barberiaNorte,
  barberiaPausada,
  DAY,
  SLOT_TAKEN_ID,
  sinServicios,
  vaciosDemo,
} from "./fixtures";

function selection(
  overrides: Partial<BookingFlowState["selection"]>,
): BookingFlowState["selection"] {
  return {
    serviceId: null,
    staffId: "any",
    date: null,
    slotId: null,
    ...overrides,
  };
}

function state(overrides: Partial<BookingFlowState> = {}): BookingFlowState {
  return {
    step: "seleccion",
    selection: selection({}),
    waitlistJoined: false,
    formStatus: "idle",
    errorCode: null,
    removedSlotIds: [],
    ...overrides,
  };
}

const normalSelection = selection({
  serviceId: "cb",
  staffId: "any",
  date: DAY.vie2,
  slotId: "cb-2026-10-02-1045",
});

const llenoSelection = selection({
  serviceId: "cb",
  staffId: "any",
  date: DAY.sab3,
  slotId: null,
});

interface Preset {
  data: BookingPageData;
  screenProps: Partial<
    Pick<
      BookingScreenProps,
      "initialState" | "loadingHorarios" | "initialFormErrors" | "forceOffline"
    >
  >;
}

const PRESETS: Record<string, Preset> = {
  // Reserva.png (den exporterade referensbilden) visar Corte clásico · Lun 5,
  // 16:30 — inte konstruktörens råa default i Reserva.dc.html (service 'cb', day
  // 'ma6', time '11:30'). Bilden är källan till sanning (DESIGN.md §"Källa till
  // sanning"): designern klickade fram det här läget innan exporten.
  estandar: {
    data: barberiaNorte,
    screenProps: {
      initialState: state({
        selection: selection({
          serviceId: "c",
          staffId: "any",
          date: DAY.lun5,
          slotId: "c-2026-10-05-1630",
        }),
      }),
    },
  },
  normal: {
    data: barberiaNorte,
    screenProps: { initialState: state({ selection: normalSelection }) },
  },
  lleno: {
    data: barberiaNorte,
    screenProps: { initialState: state({ selection: llenoSelection }) },
  },
  "lista-unida": {
    data: barberiaNorte,
    screenProps: {
      initialState: state({
        selection: llenoSelection,
        waitlistJoined: true,
      }),
    },
  },
  "lista-duplicada": {
    data: barberiaNorte,
    screenProps: {
      initialState: state({
        selection: llenoSelection,
        waitlistJoined: true,
        errorCode: "waitlist_duplicate",
      }),
    },
  },
  "sin-seleccion": {
    data: barberiaNorte,
    screenProps: { initialState: state() },
  },
  datos: {
    data: barberiaNorte,
    screenProps: {
      initialState: state({ step: "datos", selection: normalSelection }),
    },
  },
  "datos-lista": {
    data: barberiaNorte,
    screenProps: {
      initialState: state({ step: "datos", selection: llenoSelection }),
    },
  },
  "datos-errores": {
    data: barberiaNorte,
    screenProps: {
      initialState: state({ step: "datos", selection: normalSelection }),
      initialFormErrors: {
        name: errores.reserva.nombreVacio,
        phone: errores.reserva.telefono.not_mobile,
        email: errores.reserva.emailInvalido,
        terms: errores.reserva.consentimientoRequerido,
      },
    },
  },
  enviando: {
    data: barberiaNorte,
    screenProps: {
      initialState: state({
        step: "datos",
        selection: normalSelection,
        formStatus: "submitting",
      }),
    },
  },
  "slot-tomado": {
    data: barberiaNorte,
    screenProps: {
      initialState: state({
        selection: selection({
          serviceId: "cb",
          staffId: "any",
          date: DAY.jue8,
          slotId: null,
        }),
        errorCode: "slot_taken",
        removedSlotIds: [SLOT_TAKEN_ID],
      }),
    },
  },
  "error-red": {
    data: barberiaNorte,
    screenProps: {
      initialState: state({
        step: "datos",
        selection: normalSelection,
        errorCode: "network",
      }),
    },
  },
  "sin-conexion": {
    data: barberiaNorte,
    screenProps: {
      initialState: state({ selection: normalSelection }),
      forceOffline: true,
    },
  },
  confirmacion: {
    data: barberiaNorte,
    screenProps: {
      initialState: state({ step: "confirmacion", selection: normalSelection }),
    },
  },
  cargando: {
    data: barberiaNorte,
    screenProps: {
      initialState: state({
        selection: selection({
          serviceId: "cb",
          staffId: "any",
          date: DAY.vie2,
          slotId: null,
        }),
      }),
      loadingHorarios: true,
    },
  },
  "sin-horas-dia": {
    data: vaciosDemo,
    screenProps: {
      initialState: state({
        selection: selection({
          serviceId: "y",
          staffId: "any",
          date: DAY.vie2,
        }),
      }),
    },
  },
  "sin-horas-rango": {
    data: vaciosDemo,
    screenProps: {
      initialState: state({ selection: selection({ serviceId: "x" }) }),
    },
  },
  "sin-servicios": {
    data: sinServicios,
    screenProps: {},
  },
  "no-disponible": {
    data: barberiaPausada,
    screenProps: {},
  },
};

export default async function DesignLabReservaPage({
  searchParams,
}: {
  searchParams: Promise<{ estado?: string }>;
}) {
  const { estado } = await searchParams;
  const preset = (estado && PRESETS[estado]) || PRESETS.estandar!;
  const { data } = preset;
  const slug = data.business.slug;

  async function submitBooking(
    input: CustomerFormOutput,
  ): Promise<BookingActionResult> {
    "use server";
    return createBookingAction(slug, input);
  }

  async function submitWaitlist(
    input: WaitlistFormOutput,
  ): Promise<BookingActionResult> {
    "use server";
    return joinWaitlistAction(slug, input);
  }

  return (
    <div className="relative h-265 w-97.5 overflow-hidden bg-canvas">
      <BookingScreen
        data={data}
        submitBooking={submitBooking}
        joinWaitlist={submitWaitlist}
        {...preset.screenProps}
      />
    </div>
  );
}
