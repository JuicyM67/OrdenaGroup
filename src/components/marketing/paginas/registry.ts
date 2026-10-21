// Vilken ikon, pastell, bild och relaterade sidor varje funktionssida har (WP-75). Texterna
// bor i `src/i18n/paginas/*`; adresserna i `src/config/routes.ts`.
import {
  BadgeCheck,
  Bell,
  BellRing,
  CalendarCheck,
  CalendarDays,
  ChartLine,
  Clock,
  CreditCard,
  Globe,
  Layers,
  ListChecks,
  Lock,
  MessageSquareReply,
  Package,
  Repeat,
  Replace,
  ShieldCheck,
  Smartphone,
  Star,
  TrendingUp,
  UserCheck,
  Users,
  Wallet,
  Zap,
  type LucideIcon,
} from "lucide-react";

import type { FuncionId } from "@/config/routes";

export type Tone = "lavender" | "mint" | "peach" | "sky" | "lime";

/** Pastellrutan bakom ikonen (samma färger som i referensen, via tokens). */
export const TONE_CLASS: Record<Tone, string> = {
  lavender: "bg-lavender",
  mint: "bg-success-bg",
  peach: "bg-peach-50",
  sky: "bg-sky",
  lime: "bg-lime-50",
};

export type FuncionUi = {
  readonly icon: LucideIcon;
  readonly tone: Tone;
  /** Fil i public/marketing. */
  readonly foto: string;
  readonly fotoPos: string;
  /** Ikoner för de tre fördelarna. */
  readonly beneficios: readonly [LucideIcon, LucideIcon, LucideIcon];
  /** Upp till tre relaterade funktioner. */
  readonly relacionadas: readonly FuncionId[];
};

export const FUNCION_UI: Record<FuncionId, FuncionUi> = {
  reservas: {
    icon: CalendarDays,
    tone: "lavender",
    foto: "reservas",
    fotoPos: "object-top",
    beneficios: [Clock, Globe, ShieldCheck],
    relacionadas: ["recordatorios", "listaEspera"],
  },

  resenas: {
    icon: Star,
    tone: "peach",
    foto: "resenas",
    fotoPos: "object-top",
    beneficios: [BadgeCheck, MessageSquareReply, TrendingUp],
    relacionadas: ["reservas", "recordatorios", "caja"],
  },
  horasFlash: {
    icon: Zap,
    tone: "lime",
    foto: "horasflash",
    fotoPos: "object-center",
    beneficios: [Wallet, Layers, Lock],
    relacionadas: ["listaEspera", "recordatorios", "reservas"],
  },
  listaEspera: {
    icon: ListChecks,
    tone: "sky",
    foto: "listaespera",
    fotoPos: "object-top",
    beneficios: [CalendarCheck, UserCheck, Zap],
    relacionadas: ["horasFlash", "recordatorios", "agenda"],
  },
  recordatorios: {
    icon: Bell,
    tone: "lavender",
    foto: "recordatorios",
    fotoPos: "object-top",
    beneficios: [BellRing, Repeat, Package],
    relacionadas: ["listaEspera", "reservas", "agenda"],
  },
  agenda: {
    icon: Users,
    tone: "peach",
    foto: "agenda",
    fotoPos: "object-center",
    beneficios: [Users, Smartphone, CalendarCheck],
    relacionadas: ["reservas", "caja", "recordatorios"],
  },
  caja: {
    icon: ChartLine,
    tone: "mint",
    foto: "caja",
    fotoPos: "object-center",
    beneficios: [Wallet, CreditCard, TrendingUp],
    relacionadas: ["agenda", "resenas", "reservas"],
  },
  migracion: {
    icon: Replace,
    tone: "lime",
    foto: "migracion",
    fotoPos: "object-center",
    beneficios: [Package, ShieldCheck, Lock],
    relacionadas: ["reservas", "agenda", "recordatorios"],
  },
};
