// Vilka frågor gäller en tjänst, sedd från klienten (WP-40 steg 6–7, D-031).
// Ren funktion, samma regler som `src/server/booking-questions/resolve.ts`
// (aktiv + `all`/tjänst-mål/kategori-mål, max `maxPerService`, sorterad) —
// duplicerad i stället för importerad: filen har `"server-only"` (samma
// regel som resten av klientkoden i den här mappen). Används för
// förhandsvisningen (vy A) och tjänstens "Frågor vid bokning" (vy B); listan
// som ägaren sparar mot valideras alltid på nytt av servern.
import type {
  BookingFormQuestion,
  BookingFormService,
} from "./booking-form-types";

function byOrder(a: BookingFormQuestion, b: BookingFormQuestion): number {
  if (a.sort !== b.sort) return a.sort - b.sort;
  return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
}

export function questionsApplyingToService(
  questions: readonly BookingFormQuestion[],
  service: Pick<BookingFormService, "id" | "categoryId">,
  maxPerService: number,
): BookingFormQuestion[] {
  const applying = questions.filter((q) => {
    if (!q.active) return false;
    if (q.appliesTo === "all") return true;
    return (
      q.serviceIds.includes(service.id) ||
      (service.categoryId !== null &&
        q.categoryIds.includes(service.categoryId))
    );
  });
  return [...applying].sort(byOrder).slice(0, maxPerService);
}
