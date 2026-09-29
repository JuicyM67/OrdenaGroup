// CustomerAnswersCard — kundnivåsvar (WP-40, D-031, plan steg 8): senaste
// värdet per fråga (`save_to_customer`) + historik per bokning. Ingen
// referens (inget "Clientes"-skärm finns ännu i kodbasen/BACKLOG — den här
// komponenten är förberedd för den skärmen, inte kopplad till någon rutt
// än). Samma "etikett: värde"-rader som agenda/Hoy (`AnswersList`).
import { Card } from "@/components/ui/card";
import { formatDate, parseInstant, APP_TZ } from "@/lib/format/dates";
import type { CustomerAnswersView } from "@/server/booking-questions/answers";

import { AnswersList } from "../booking/answers-list";

function historyDateLabel(startIso: string): string {
  const parsed = parseInstant(startIso);
  if (!parsed.ok) return startIso; // defensivt: sparade bokningar har alltid en giltig instant
  return formatDate(parsed.value, APP_TZ, "weekdayDayMonthLong");
}

export function CustomerAnswersCard({ data }: { data: CustomerAnswersView }) {
  if (data.latest.length === 0 && data.history.length === 0) return null;
  return (
    <Card radius="tile" padding="lg" className="flex flex-col gap-4">
      {data.latest.length > 0 ? <AnswersList answers={data.latest} /> : null}
      {data.history.length > 0 ? (
        <div className="flex flex-col gap-3">
          {data.history.map((entry) => (
            <div key={entry.bookingId} className="flex flex-col gap-1">
              <div className="text-12 font-semibold text-muted">
                {historyDateLabel(entry.start)}
              </div>
              <AnswersList answers={entry.answers} />
            </div>
          ))}
        </div>
      ) : null}
    </Card>
  );
}
