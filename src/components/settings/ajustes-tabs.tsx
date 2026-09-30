// Delad flik-lista för /app/ajustes/[flik] (WP-55): nio flikar i stället för en lång
// skärm med alla sektioner staplade som kort (ägarens feedback 2026-09-30, se
// `docs/tasks/BACKLOG.md`). Ingen "use client": filen har inga hooks, bara data och
// färdiga ikon-element — importeras både av serverkomponenterna under
// `src/app/(app)/app/ajustes/*/page.tsx` (för behörighetskontroll/redirect och för att
// bygga listan som skickas till `AjustesShell`) och indirekt av `ajustes-shell.tsx`
// (bara typerna, `AjustesTabItem`/`AjustesTabKey`).
//
// Inga referensbilder för den här navigeringen (Ajustes har aldrig haft en egen
// *.dc.html-skärm, se `ajustes-shell.tsx`s filkommentar): ikonvalen nedan återanvänder
// biblioteket redan i bruk (`lucide-react`, DESIGN.md §6) men är nya per flik (`Building2`,
// `Image`, `ClipboardList`, `CalendarClock`, `Gift`, `Shield`) — `Clock`, `Scissors` och
// `Users` återanvänder redan etablerade betydelser (`src/components/ui/icons.ts`).
import {
  Building2,
  CalendarClock,
  ClipboardList,
  Clock,
  Gift,
  Image as ImageIcon,
  Scissors,
  Shield,
  Users,
  type LucideIcon,
} from "lucide-react";
import type { ReactNode } from "react";

import { strokeNav } from "@/components/ui/icons";
import { ajustes, perfil } from "@/i18n";

export const AJUSTES_TAB_KEYS = [
  "negocio",
  "perfil",
  "reglas",
  "servicios",
  "formulario",
  "horario",
  "socios",
  "equipo",
  "privacidad",
] as const;

export type AjustesTabKey = (typeof AJUSTES_TAB_KEYS)[number];

/** Minsta möjliga spegling av `MemberView` (`src/server/owner/member.ts`) — bara det den
 * här filen behöver för att avgöra vilka flikar som syns, samma duplicerings-motiv som
 * `src/components/settings/types.ts`s filkommentar (klientkod importerar aldrig
 * `@/server/*`, och den här filen används även av serverkomponenter men ska ändå bara
 * bero på en smal, stabil form). */
export type AjustesTabAccess = {
  role: "owner" | "staff" | "vendor" | "admin" | null;
  perms: {
    can_edit_settings: boolean;
    can_edit_catalog: boolean;
    can_manage_team: boolean;
  };
};

const AJUSTES_TAB_LABEL: Record<AjustesTabKey, string> = {
  negocio: ajustes.secciones.negocio,
  perfil: perfil.ajustes.titulo,
  reglas: ajustes.secciones.reglas,
  servicios: ajustes.secciones.servicios,
  formulario: ajustes.secciones.formularioReserva,
  horario: ajustes.secciones.horario,
  socios: ajustes.secciones.socios,
  equipo: ajustes.secciones.equipo,
  privacidad: ajustes.secciones.privacidad,
};

const AJUSTES_TAB_ICON: Record<AjustesTabKey, LucideIcon> = {
  negocio: Building2,
  perfil: ImageIcon,
  reglas: Clock,
  servicios: Scissors,
  formulario: ClipboardList,
  horario: CalendarClock,
  socios: Gift,
  equipo: Users,
  privacidad: Shield,
};

export function ajustesTabHref(key: AjustesTabKey): string {
  return `/app/ajustes/${key}`;
}

/** Samma regler som tidigare i `ajustes-screen.tsx`: `can_edit_settings` för
 * Negocio/Perfil/Reglas/Horario/Socios, `can_edit_catalog` för Servicios/Formulario,
 * `can_manage_team` för Equipo (ägaren har den alltid, `hasPerm`), bara ägaren för
 * Privacidad. */
export function ajustesTabVisible(
  key: AjustesTabKey,
  access: AjustesTabAccess,
): boolean {
  switch (key) {
    case "negocio":
    case "perfil":
    case "reglas":
    case "horario":
    case "socios":
      return access.perms.can_edit_settings;
    case "servicios":
    case "formulario":
      return access.perms.can_edit_catalog;
    case "equipo":
      return access.perms.can_manage_team;
    case "privacidad":
      return access.role === "owner";
  }
}

export type AjustesTabItem = {
  key: AjustesTabKey;
  href: string;
  label: string;
  icon: ReactNode;
};

/** Flikarna den inloggade får se, i fast ordning — skickas till `AjustesShell`. */
export function buildAjustesTabs(access: AjustesTabAccess): AjustesTabItem[] {
  return AJUSTES_TAB_KEYS.filter((key) => ajustesTabVisible(key, access)).map(
    (key) => {
      const Icon = AJUSTES_TAB_ICON[key];
      return {
        key,
        href: ajustesTabHref(key),
        label: AJUSTES_TAB_LABEL[key],
        icon: (
          <Icon
            aria-hidden="true"
            className="size-4.5"
            strokeWidth={strokeNav}
          />
        ),
      };
    },
  );
}

/** `/app/ajustes` (utan flik) pekar om hit — `null` om den inloggade inte har någon
 * flik alls (samma fall som tidigare skickade till /app/agenda). */
export function firstAjustesTabHref(access: AjustesTabAccess): string | null {
  const first = AJUSTES_TAB_KEYS.find((key) => ajustesTabVisible(key, access));
  return first ? ajustesTabHref(first) : null;
}
