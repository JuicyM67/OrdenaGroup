import "server-only";

/**
 * Svar på bokningsfrågor (WP-40 steg 3, D-031).
 *
 * - `saveBookingAnswersIn` körs i bokningens egen transaktion (`createIn`):
 *   `booking_answers` får en kopia av etikett och typ (läsbar även om frågan
 *   ändras eller tas bort), `customer_answers` uppdateras med senaste värdet
 *   bara för frågor med `save_to_customer`.
 * - Läsfunktionerna (agenda/Hoy, kundkortet) går via `withOwnerTx` (RLS) och
 *   filtrerar dessutom på `business_id`.
 *
 * Svaren kan vara persondata (Ley 21.719): de loggas aldrig och läggs aldrig
 * i `message_outbox.payload`.
 */
import type { Queryable } from "@/server/db/pool";
import { withOwnerTx } from "@/server/db/tx";
import type {
  AnswerValue,
  BookingQuestionDef,
  QuestionKind,
  ValidatedAnswer,
} from "@/lib/validation/booking-questions";

export type SaveBookingAnswersInput = {
  businessId: string;
  bookingId: string;
  customerId: string;
  /** Serverns frågelista för tjänsten (samma som valideringen använde). */
  questions: readonly BookingQuestionDef[];
  answers: readonly ValidatedAnswer[];
};

export async function saveBookingAnswersIn(
  q: Queryable,
  input: SaveBookingAnswersInput,
): Promise<void> {
  const byId = new Map(input.questions.map((x) => [x.id, x]));
  for (const a of input.answers) {
    const question = byId.get(a.questionId);
    // Programmeringsfel: svaren validerades mot just den här listan.
    if (!question) throw new TypeError("saveBookingAnswersIn: okänd fråga");
    const value = JSON.stringify(a.value);
    await q.query(
      `insert into public.booking_answers
         (business_id, booking_id, question_id, label_snapshot, kind_snapshot, value)
       values ($1, $2, $3, $4, $5::public.question_kind, $6::jsonb)`,
      [
        input.businessId,
        input.bookingId,
        question.id,
        question.label,
        question.kind,
        value,
      ],
    );
    if (question.saveToCustomer) {
      await q.query(
        `insert into public.customer_answers (business_id, customer_id, question_id, value)
         values ($1, $2, $3, $4::jsonb)
         on conflict (customer_id, question_id)
         do update set value = excluded.value
         where customer_answers.business_id = excluded.business_id`,
        [input.businessId, input.customerId, question.id, value],
      );
    }
  }
}

// ---------------------------------------------------------------------------
// Läsning
// ---------------------------------------------------------------------------

export type BookingAnswerView = {
  /** null om frågan har tagits bort (svaret finns kvar med sin kopia). */
  questionId: string | null;
  label: string;
  kind: QuestionKind;
  value: AnswerValue;
};

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

export type CustomerAnswersView = {
  /** Senaste sparade värden (`save_to_customer`), i frågornas ordning. */
  latest: CustomerAnswerView[];
  /** Svar per bokning, senaste bokningen först. */
  history: CustomerAnswerHistoryEntry[];
};

type AnswerRow = {
  booking_id: string;
  question_id: string | null;
  label_snapshot: string;
  kind_snapshot: QuestionKind;
  value: AnswerValue;
};

const isoOf = (ms: number) => new Date(Math.round(ms)).toISOString();

function toView(r: AnswerRow): BookingAnswerView {
  return {
    questionId: r.question_id,
    label: r.label_snapshot,
    kind: r.kind_snapshot,
    value: r.value,
  };
}

/** Svar för flera bokningar (agenda/Hoy), grupperat per bokning. */
export async function listBookingAnswersIn(
  q: Queryable,
  businessId: string,
  bookingIds: readonly string[],
): Promise<Record<string, BookingAnswerView[]>> {
  const out: Record<string, BookingAnswerView[]> = {};
  if (bookingIds.length === 0) return out;
  const r = await q.query<AnswerRow>(
    `select ba.booking_id, ba.question_id, ba.label_snapshot, ba.kind_snapshot, ba.value
       from public.booking_answers ba
       left join public.booking_questions bq
         on bq.business_id = ba.business_id and bq.id = ba.question_id
      where ba.business_id = $1 and ba.booking_id = any($2::uuid[])
      order by ba.booking_id, bq.sort nulls last, ba.created_at, ba.label_snapshot`,
    [businessId, bookingIds],
  );
  for (const row of r.rows) {
    (out[row.booking_id] ??= []).push(toView(row));
  }
  return out;
}

export async function getBookingAnswers(
  userId: string,
  businessId: string,
  bookingId: string,
): Promise<BookingAnswerView[]> {
  const r = await withOwnerTx(userId, (q) =>
    listBookingAnswersIn(q, businessId, [bookingId]),
  );
  return r[bookingId] ?? [];
}

export function getBookingAnswersForBookings(
  userId: string,
  businessId: string,
  bookingIds: readonly string[],
): Promise<Record<string, BookingAnswerView[]>> {
  return withOwnerTx(userId, (q) =>
    listBookingAnswersIn(q, businessId, bookingIds),
  );
}

type CustomerAnswerRow = {
  question_id: string;
  label: string;
  kind: QuestionKind;
  value: AnswerValue;
  updated_ms: number;
};

type HistoryRow = AnswerRow & { start_ms: number };

/** Högst så många bokningar i historiken på kundkortet. */
const HISTORY_LIMIT = 20;

export async function getCustomerAnswersIn(
  q: Queryable,
  businessId: string,
  customerId: string,
): Promise<CustomerAnswersView> {
  const latest = await q.query<CustomerAnswerRow>(
    `select ca.question_id, bq.label, bq.kind, ca.value,
            extract(epoch from ca.updated_at)::float8 * 1000 as updated_ms
       from public.customer_answers ca
       join public.booking_questions bq
         on bq.business_id = ca.business_id and bq.id = ca.question_id
      where ca.business_id = $1 and ca.customer_id = $2
      order by bq.sort, bq.id`,
    [businessId, customerId],
  );
  const history = await q.query<HistoryRow>(
    `select ba.booking_id, ba.question_id, ba.label_snapshot, ba.kind_snapshot, ba.value,
            extract(epoch from lower(b.period))::float8 * 1000 as start_ms
       from public.booking_answers ba
       join public.bookings b
         on b.business_id = ba.business_id and b.id = ba.booking_id
       left join public.booking_questions bq
         on bq.business_id = ba.business_id and bq.id = ba.question_id
      where ba.business_id = $1 and b.business_id = $1 and b.customer_id = $2
        and ba.booking_id in (
          select b2.id from public.bookings b2
           where b2.business_id = $1 and b2.customer_id = $2
             and exists (select 1 from public.booking_answers x
                          where x.business_id = $1 and x.booking_id = b2.id)
           order by lower(b2.period) desc
           limit ${HISTORY_LIMIT})
      order by lower(b.period) desc, ba.booking_id, bq.sort nulls last,
               ba.created_at, ba.label_snapshot`,
    [businessId, customerId],
  );
  const entries: CustomerAnswerHistoryEntry[] = [];
  for (const row of history.rows) {
    let last = entries[entries.length - 1];
    if (!last || last.bookingId !== row.booking_id) {
      last = {
        bookingId: row.booking_id,
        start: isoOf(row.start_ms),
        answers: [],
      };
      entries.push(last);
    }
    last.answers.push(toView(row));
  }
  return {
    latest: latest.rows.map((r) => ({
      questionId: r.question_id,
      label: r.label,
      kind: r.kind,
      value: r.value,
      updatedAt: isoOf(r.updated_ms),
    })),
    history: entries,
  };
}

/** Kundkortet: senaste värden + historik per bokning. */
export function getCustomerAnswers(
  userId: string,
  businessId: string,
  customerId: string,
): Promise<CustomerAnswersView> {
  return withOwnerTx(userId, (q) =>
    getCustomerAnswersIn(q, businessId, customerId),
  );
}
