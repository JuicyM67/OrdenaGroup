"use client";

// WP-47: dropdown-meny för kontot (UserPill i PageHeader, desktop) och samma meny på avataren
// i mobilhuvudet (Inicio/Hoy/Ajustes). Perfil/Ajustes/Ver mi página/Cerrar sesión — riktiga
// länkar plus en riktig `<form action={onLogout}>` (regel "riktiga knappar och länkar",
// fungerar utan JS). `onLogout` tas emot som prop i stället för att importera `logout`
// (`@/app/auth/actions`) direkt här: den importerar `server-only` transitivt
// (`@/lib/supabase/server`), och den här filen kan renderas av komponenttester i Vitests
// "dom"-projekt, som inte aliasar bort `server-only` (se main-nav.tsx). Ikonerna importeras
// direkt, samma motiv som main-nav.tsx (undviker `roleIcons`-indexering med
// `noUncheckedIndexedAccess`).
import { ExternalLink, LogOut, SlidersHorizontal, UserRound } from "lucide-react";

import { nav, onboarding, perfil } from "@/i18n";

import { Avatar, type AvatarProps } from "../ui/avatar";
import { strokeCard } from "../ui/icons";
import { Menu, MenuFormItem, MenuLinkItem } from "../ui/menu";
import { UserPill } from "../ui/user-pill";

const ICON_CLASS = "size-4 shrink-0 text-muted";

export type UserMenuProps = {
  name: string;
  initials: string;
  avatarTone?: AvatarProps["tone"];
  /** "pill": UserPill (skrivbordet, PageHeader). "avatar": bar avatar-knapp (mobil). */
  variant: "pill" | "avatar";
  /** `/${slug}` — sidan kunderna bokar från. */
  publicPageHref: string;
  /** `logout` (server action), bunden av anroparens `page.tsx`. `undefined` i design lab. */
  onLogout?: () => void | Promise<void>;
  className?: string;
};

export function UserMenu({
  name,
  initials,
  avatarTone = "lilac",
  variant,
  publicPageHref,
  onLogout,
  className,
}: UserMenuProps) {
  const trigger =
    variant === "pill" ? (
      <UserPill name={name} initials={initials} avatarTone={avatarTone} className={className} />
    ) : (
      <button
        type="button"
        aria-label={nav.menuUsuario({ nombre: name })}
        className="rounded-full focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink focus-visible:transition-none on-dark:focus-visible:outline-lime"
      >
        <Avatar initials={initials} tone={avatarTone} size={46} />
      </button>
    );

  return (
    <Menu trigger={trigger} label={nav.menuUsuario({ nombre: name })}>
      <MenuLinkItem href="/app/ajustes#perfil" prefetch={false}>
        <UserRound aria-hidden="true" className={ICON_CLASS} strokeWidth={strokeCard} />
        {perfil.ajustes.titulo}
      </MenuLinkItem>
      <MenuLinkItem href="/app/ajustes" prefetch={false}>
        <SlidersHorizontal aria-hidden="true" className={ICON_CLASS} strokeWidth={strokeCard} />
        {nav.ajustes}
      </MenuLinkItem>
      <MenuLinkItem href={publicPageHref} target="_blank" rel="noreferrer">
        <ExternalLink aria-hidden="true" className={ICON_CLASS} strokeWidth={strokeCard} />
        {onboarding.listo.ctaVerPagina}
      </MenuLinkItem>
      <MenuFormItem action={onLogout ?? (() => {})}>
        <LogOut aria-hidden="true" className={ICON_CLASS} strokeWidth={strokeCard} />
        {nav.cerrarSesion}
      </MenuFormItem>
    </Menu>
  );
}
