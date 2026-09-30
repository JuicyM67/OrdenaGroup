// Ícones/enlaces de redes sociales (WP-51): Instagram/TikTok/Facebook en el
// perfil público (`/{slug}`, encabezado y tarjeta de contacto) y en el campo
// de Ajustes → Perfil/onboarding "Tu página" (`SocialHandleField`, ícono +
// prefijo "@"). Sin referencia *.dc.html (función nueva, no dibujada en
// `ProfilDesktop.dc.html`/`ProfilMobil.dc.html`): glifos propios en vez de
// `lucide-react` (que no tiene marcas), solo `currentColor` (regla dura 1,
// ninguna marca importa colores propios).
import { AlertCircle } from "lucide-react";
import type { ChangeEvent, ComponentPropsWithoutRef, ReactNode } from "react";
import { useId } from "react";

import { cn } from "@/components/ui/cn";
import { IconButton, type IconButtonProps } from "@/components/ui/icon-button";
import { perfil, redesSociales } from "@/i18n";

type GlyphProps = ComponentPropsWithoutRef<"svg">;

export function InstagramGlyph(props: GlyphProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      <rect x="3" y="3" width="18" height="18" rx="5.5" />
      <circle cx="12" cy="12" r="4.2" />
      <circle cx="17.2" cy="6.8" r="1" fill="currentColor" stroke="none" />
    </svg>
  );
}

export function TiktokGlyph(props: GlyphProps) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" {...props}>
      <path d="M16.6 2.5c.4 2.3 1.9 3.9 4.2 4.2v3.1c-1.5 0-3-.4-4.2-1.3v6.3a5.9 5.9 0 1 1-5.9-5.9c.3 0 .6 0 .9.1v3.2a2.7 2.7 0 1 0 1.9 2.6V2.5h3.1Z" />
    </svg>
  );
}

export function FacebookGlyph(props: GlyphProps) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" {...props}>
      <path d="M13.5 21v-7.6h2.6l.4-3h-3V8.4c0-.9.3-1.5 1.6-1.5h1.6V4.2C15.9 4.1 14.9 4 13.8 4c-2.3 0-3.9 1.4-3.9 4v2.4H7.3v3H10V21h3.5Z" />
    </svg>
  );
}

export type SocialTone = Extract<IconButtonProps["tone"], "surface" | "canvas">;
export type SocialSize = Extract<IconButtonProps["size"], 36 | 44>;

/**
 * Fila de botones de ícono para Instagram/TikTok/Facebook. Las URLs ya
 * vienen completas desde el servidor (`BookingProfile.instagramUrl`/…,
 * `page-data.ts`) — este componente nunca arma un link a partir del
 * handtag, solo decide qué mostrar. `null` si no hay ningún enlace (la
 * sección que lo envuelve se oculta).
 */
export function SocialLinks({
  instagramUrl,
  tiktokUrl,
  facebookUrl,
  businessName,
  tone = "surface",
  size = 36,
  className,
}: {
  instagramUrl: string | null;
  tiktokUrl: string | null;
  facebookUrl: string | null;
  businessName: string;
  tone?: SocialTone;
  size?: SocialSize;
  className?: string;
}) {
  const links: {
    key: string;
    url: string;
    label: string;
    Icon: (props: GlyphProps) => ReactNode;
  }[] = [];
  if (instagramUrl) {
    links.push({
      key: "instagram",
      url: instagramUrl,
      label: perfil.publico.instagramAria({ negocio: businessName }),
      Icon: InstagramGlyph,
    });
  }
  if (tiktokUrl) {
    links.push({
      key: "tiktok",
      url: tiktokUrl,
      label: redesSociales.tiktokAria({ negocio: businessName }),
      Icon: TiktokGlyph,
    });
  }
  if (facebookUrl) {
    links.push({
      key: "facebook",
      url: facebookUrl,
      label: redesSociales.facebookAria({ negocio: businessName }),
      Icon: FacebookGlyph,
    });
  }
  if (links.length === 0) return null;

  return (
    <div className={cn("flex items-center gap-2", className)}>
      {links.map(({ key, url, label, Icon }) => (
        <IconButton key={key} asChild label={label} tone={tone} size={size}>
          <a href={url} target="_blank" rel="noopener noreferrer">
            <Icon className="size-4.5" />
          </a>
        </IconButton>
      ))}
    </div>
  );
}

/**
 * Campo "@usuario" con ícono de la red social (Ajustes → Perfil y
 * onboarding "Tu página", WP-51): mismo formspråk que `TextField`
 * (`src/components/ui/text-field.tsx`, no tocado acá — ver comentario de
 * scope), con un prefijo ícono + "@" que `TextField` no soporta.
 */
export function SocialHandleField({
  id: idProp,
  label,
  placeholder,
  hint,
  error,
  icon: Icon,
  value,
  onChange,
  maxLength = 30,
}: {
  id?: string;
  label: string;
  placeholder?: string;
  hint?: string;
  error?: string;
  icon: (props: GlyphProps) => ReactNode;
  value: string;
  onChange: (e: ChangeEvent<HTMLInputElement>) => void;
  maxLength?: number;
}) {
  const generatedId = useId();
  const id = idProp ?? generatedId;
  const hintId = hint ? `${id}-hint` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  const describedBy = [hintId, errorId].filter(Boolean).join(" ") || undefined;

  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-13 font-semibold text-ink">
        {label}
      </label>
      <div className="relative">
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-y-0 left-4 flex items-center gap-1 text-muted"
        >
          <Icon className="size-4.5" />
          <span className="text-15 font-medium">@</span>
        </span>
        <input
          id={id}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          maxLength={maxLength}
          aria-invalid={!!error}
          aria-describedby={describedBy}
          className={cn(
            "h-13 w-full rounded-control border-2 border-transparent bg-surface py-0 pr-4 pl-16 text-15 font-medium text-ink transition-colors duration-150 ease-out placeholder:text-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink focus-visible:transition-none",
            error && "border-alert",
          )}
        />
      </div>
      {hint && !error ? (
        <span id={hintId} className="text-13 text-muted">
          {hint}
        </span>
      ) : null}
      {error ? (
        <span
          id={errorId}
          className="flex items-center gap-1.5 text-13 text-ink"
        >
          <AlertCircle
            aria-hidden="true"
            className="size-4 shrink-0 text-alert"
            strokeWidth={2}
          />
          {error}
        </span>
      ) : null}
    </div>
  );
}
