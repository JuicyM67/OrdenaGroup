"use server";

// WP-105 (D-079): salir del modo soporte desde la banderoll i /app. `userId`
// läses ur sessionen; funktionen tar bara bort den inloggades egna
// supportrader, aldrig ett vanligt medlemskap. Tillbaka till företaget i admin.
import { redirect } from "next/navigation";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { endSupport } from "@/server/admin/support";

export async function endSupportAction(): Promise<void> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { businessId } = await endSupport(user.id);
  redirect(businessId ? `/admin/negocios/${businessId}` : "/admin");
}
