// Vilka medarbetare som utför en tjänst. Källan är tillgänglighetsnycklarna som
// servern skickar (`staffOffersService` filtrerar redan där), inte `staffIds`.
import type { BookingPageData, BookingStaffMember } from "./types";

export function staffOfferingService(
  data: Pick<BookingPageData, "staff" | "availability">,
  serviceId: string,
): readonly BookingStaffMember[] {
  const perStaff = data.availability[serviceId];
  if (!perStaff) return [];
  return data.staff.filter((member) =>
    Object.prototype.hasOwnProperty.call(perStaff, member.id),
  );
}
