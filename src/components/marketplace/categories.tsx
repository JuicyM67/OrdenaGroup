// Kategorierna i Upptäck (WP-68): ikon + pastellton per kategori. Tonerna är
// personalpaletten (`bg-staff-*`), samma pastellfamilj som startsidans ikoncirklar.
import {
  Eye,
  Flower2,
  Hand,
  LayoutGrid,
  type LucideIcon,
  Scissors,
  Sparkles,
  Star,
} from "lucide-react";

import type { MarketplaceCategoryId } from "@/config/marketplace";

export const CATEGORY_UI: Record<
  MarketplaceCategoryId,
  { icon: LucideIcon; tone: string }
> = {
  har: { icon: Scissors, tone: "bg-staff-3" },
  naglar: { icon: Hand, tone: "bg-staff-4" },
  massage: { icon: Flower2, tone: "bg-staff-2" },
  hudvard: { icon: Sparkles, tone: "bg-staff-5" },
  fransar: { icon: Eye, tone: "bg-staff-6" },
  ovrigt: { icon: Star, tone: "bg-staff-1" },
};

export const ALL_ICON = LayoutGrid;
