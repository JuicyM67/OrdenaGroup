// /app/clientes (WP-24, F9): kundregistret. Alla medlemmar ser listan
// (D-034) — sök/sortera/filtrera via URL:en (?q=&orden=&filtro=), samma
// mönster som Agenda (?vista=&fecha=, src/app/(app)/app/agenda/page.tsx).
import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { logout } from "@/app/auth/actions";
import {
  CustomersScreen,
  type CustomersQuery,
} from "@/components/customers/customers-screen";
import type {
  CustomerListFilter,
  CustomerListSort,
} from "@/components/customers/types";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getCurrentMember } from "@/server/onboarding/owner-business";
import { listCustomers } from "@/server/owner/clientes";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

// VERCEL_ENV måste läsas per request, se src/app/design-lab/layout.tsx.
export const dynamic = "force-dynamic";

const SORTS: readonly CustomerListSort[] = [
  "ultimaVisita",
  "masVisitas",
  "nombre",
];
const FILTERS: readonly CustomerListFilter[] = [
  "todos",
  "habituales",
  "inactivos",
  "conInasistencias",
  "socios",
];

export default async function ClientesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; orden?: string; filtro?: string }>;
}) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const current = await getCurrentMember(user.id);
  if (!current) redirect("/app/onboarding");

  const { q, orden, filtro } = await searchParams;
  const query: CustomersQuery = {
    q: q ?? "",
    sort: SORTS.includes(orden as CustomerListSort)
      ? (orden as CustomerListSort)
      : "ultimaVisita",
    filter: FILTERS.includes(filtro as CustomerListFilter)
      ? (filtro as CustomerListFilter)
      : "todos",
  };

  const now = new Date();
  const { items } = await listCustomers(user.id, current.business.id, now, {
    search: query.q || undefined,
    sort: query.sort,
    filter: query.filter,
  });

  return (
    <CustomersScreen
      items={items}
      query={query}
      canViewReports={current.view.perms.can_view_reports}
      canManageCampaigns={current.view.perms.can_manage_all_bookings}
      onLogout={logout}
    />
  );
}
