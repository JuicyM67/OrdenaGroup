// Minimal rad ovanför wizarden: vem som är inloggad + utloggning (WP-15, "riktiga knappar
// och länkar"). Bara på /app/onboarding — påverkar inte skärmdumparna för Inicio/Agenda/Hoy.
import { ajustes, nav } from "@/i18n";

import { logout } from "@/app/auth/actions";

export function SessionBar({ email }: { email: string }) {
  return (
    <div className="flex items-center justify-between gap-3 text-13 text-muted">
      <span>{ajustes.cuenta.sesionComo({ email })}</span>
      <form action={logout}>
        <button
          type="submit"
          className="font-semibold text-ink underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
        >
          {nav.cerrarSesion}
        </button>
      </form>
    </div>
  );
}
