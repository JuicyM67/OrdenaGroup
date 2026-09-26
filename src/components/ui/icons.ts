// Ikonval enligt docs/design/DESIGN.md §6. lucide-react (FRÅGA 5): godtar små
// pixelskillnader mot referensens egna SVG:er. LogoMark är enda egna SVG:en (logo-mark.tsx).
import {
  ArrowUpRight,
  BarChart3,
  Calendar,
  Clock,
  CreditCard,
  Ellipsis,
  LayoutGrid,
  List,
  MessageSquare,
  Scissors,
  SlidersHorizontal,
  Users,
  Zap,
  type LucideIcon,
} from "lucide-react";

/** Strecktjocklek, se DESIGN.md §6. */
export const strokeNav = 1.8;
export const strokeCard = 2;
export const strokeArrow = 2.2;

/** Betydelse → lucide-ikon, se DESIGN.md §6. */
export const roleIcons: Record<string, LucideIcon> = {
  inicio: LayoutGrid,
  agenda: Calendar,
  clientes: Users,
  horasFlash: Zap,
  caja: BarChart3,
  ajustes: SlidersHorizontal,
  listaEspera: List,
  teEchamosDeMenos: MessageSquare,
  pago: CreditCard,
  tiempo: Clock,
  abrir: ArrowUpRight,
  servicio: Scissors,
  masOpciones: Ellipsis,
};
