// /app/admin → /admin: lättare att komma ihåg för plattformsadmins. Den som
// inte är admin får 404 på /admin (requireAdminPage), precis som förut.
import { redirect } from "next/navigation";

export default function AppAdminRedirect() {
  redirect("/admin");
}
