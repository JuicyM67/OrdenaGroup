// WP-24 (F9) · Klienttyper för Clientes. Speglar (duplicerar, inte
// importerar) `src/server/owner/clientes.ts` — en "use client"-fil importerar
// aldrig något, inte ens bara typer, under `@/server/*` (samma regel som
// `AgendaMemberView`/`HoyMemberView`, `TeamPerms` i settings/team-section.tsx,
// och `src/components/caja/types.ts`). Håll de två filerna i synk för hand.
// `QuestionKind`/`AnswerValue` ligger i `@/lib/validation/` (INTE `@/server/`)
// och är redan den delade typen bakom `AnswersList`/`CustomerAnswersCard`
// (`src/components/booking/answer-format.ts`) — importeras direkt i stället
// för att dupliceras en tredje gång, så `answers` nedan är strukturellt
// identisk med `CustomerAnswersView` (`src/server/booking-questions/answers.ts`)
// och kan återanvända den komponenten utan cast. `ConsentChannel`
// (`ConsentChannel = "web" | "whatsapp" | "manual"`) dupliceras här eftersom
// den bor under `@/server/privacy/types.ts`.
import type {
  AnswerValue,
  QuestionKind,
} from "@/lib/validation/booking-questions";

export type ConsentChannel = "web" | "whatsapp" | "manual";

export type CustomerListSort = "ultimaVisita" | "masVisitas" | "nombre";
export type CustomerListFilter =
  | "todos"
  | "habituales"
  | "inactivos"
  | "conInasistencias"
  // WP-54: clientes marcados como `is_member` ("socios", ver es-CL.ts).
  | "socios";

/** Duplicat av `HABITUAL_VISITS_THRESHOLD` (`src/server/owner/clientes.ts`):
 * la etiqueta "Habitual" de la fila/ficha se calcula en el cliente a partir
 * de `visitsCount`, mismo umbral que el filtro `habituales`. */
export const HABITUAL_VISITS_THRESHOLD = 3;

export type CustomerListItem = {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  visitsCount: number;
  noShowCount: number;
  /** ISO 8601 UTC, `null` = aldrig ett avslutat besök. */
  lastVisitAt: string | null;
  /** WP-54: `customers.is_member`. */
  isMember: boolean;
  /** WP-57 (UX, taggen "Samtycke"): `consent_marketing_at is not null`. */
  hasMarketingConsent: boolean;
};

/** WP-57 (UX): antal per filter, oberoende av `?filtro=`/`?q=`. */
export type CustomerFilterCounts = Record<CustomerListFilter, number>;

export type CustomerConsentView = {
  /** ISO 8601 UTC, `null` = inget registrerat samtycke. */
  at: string | null;
  channel: ConsentChannel | null;
};

export type CustomerStats = {
  visitsCount: number;
  noShowCount: number;
  totalRevenueClp: number;
  /** `null` = inga betalningar ännu. */
  averagePriceClp: number | null;
  /** ISO 8601 UTC, `null` = aldrig ett avslutat besök. */
  lastVisitAt: string | null;
};

export type CustomerBookingRow = {
  id: string;
  /** ISO 8601 UTC. */
  start: string;
  end: string;
  service: string;
  staffName: string;
  status: string;
  priceClp: number;
  depositPaidClp: number;
};

/** Speglar `BookingAnswerView` (`src/server/booking-questions/answers.ts`). */
export type BookingAnswerView = {
  /** null om frågan har tagits bort (svaret finns kvar med sin kopia). */
  questionId: string | null;
  label: string;
  kind: QuestionKind;
  value: AnswerValue;
};

/** Speglar `CustomerAnswerView` (samma fil) — `questionId`/`updatedAt` är
 * ALLTID satta här (senaste värdet per fråga), till skillnad från
 * `BookingAnswerView` i historiken. */
export type CustomerAnswerView = {
  questionId: string;
  label: string;
  kind: QuestionKind;
  value: AnswerValue;
  /** ISO UTC. */
  updatedAt: string;
};

export type CustomerAnswerHistoryEntry = {
  bookingId: string;
  /** Bokningens start, ISO UTC. */
  start: string;
  answers: BookingAnswerView[];
};

/** Strukturellt identisk med `CustomerAnswersView`
 * (`src/server/booking-questions/answers.ts`) — kan skickas rakt in i
 * `CustomerAnswersCard` (`src/components/agenda/customer-answers-card.tsx`,
 * vars props bara importerar TYPEN dit, `import type`, aldrig ett värde). */
export type CustomerAnswersView = {
  /** Senaste sparade värden (`save_to_customer`), i frågornas ordning. */
  latest: CustomerAnswerView[];
  /** Svar per bokning, senaste bokningen först. */
  history: CustomerAnswerHistoryEntry[];
};

export type CustomerDetail = {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  notes: string | null;
  /** ISO 8601 UTC. */
  createdAt: string;
  consentTerms: CustomerConsentView;
  consentMarketing: CustomerConsentView;
  /** Besök/uteblivna/senaste besök syns alltid; pengarna är redigerade bort
   * (0/`null`) på servern om `canViewMoney` är falskt. */
  stats: CustomerStats;
  canViewMoney: boolean;
  upcoming: CustomerBookingRow[];
  history: CustomerBookingRow[];
  answers: CustomerAnswersView;
  canEditNotes: boolean;
  isOwner: boolean;
  /** WP-54: `customers.is_member`/`member_since`. */
  isMember: boolean;
  /** ISO 8601 UTC, `null` = inte socio (eller aldrig blivit det). */
  memberSince: string | null;
  /** Samma spärr som `canEditNotes`. */
  canManageMembership: boolean;
};

export type UpdateNotesResult =
  | { ok: true }
  | {
      ok: false;
      code: "unauthorized" | "forbidden" | "not_found" | "too_long";
    };

export type SetMemberResult =
  | { ok: true }
  | { ok: false; code: "unauthorized" | "forbidden" | "not_found" };

export type NotifyMemberResult =
  | { ok: true; queued: boolean }
  | { ok: false; code: "forbidden" | "not_member" | "no_email" };
