// Kategorierna i Descubre (WP-68): ikon + pastellton per kategori. Tonerna är
// personalpaletten (`bg-staff-*`), samma pastellfamilj som startsidans ikoncirklar.
import {
  Bath,
  Brush,
  Car,
  Droplets,
  Dumbbell,
  Eye,
  Hand,
  HandHeart,
  HeartPulse,
  LayoutGrid,
  type LucideIcon,
  PawPrint,
  PenTool,
  Scissors,
  SprayCan,
  Sprout,
  Star,
  WandSparkles,
} from "lucide-react";

import type { MarketplaceCategoryId } from "@/config/marketplace";

export const CATEGORY_UI: Record<
  MarketplaceCategoryId,
  { icon: LucideIcon; tone: string }
> = {
  har: { icon: Scissors, tone: "bg-staff-3" },
  barberare: { icon: Brush, tone: "bg-staff-1" },
  naglar: { icon: Hand, tone: "bg-staff-4" },
  fransar: { icon: Eye, tone: "bg-staff-6" },
  hudvard: { icon: Droplets, tone: "bg-staff-5" },
  skonhet: { icon: WandSparkles, tone: "bg-staff-2" },
  massage: { icon: HandHeart, tone: "bg-staff-2" },
  spa: { icon: Bath, tone: "bg-staff-5" },
  halsa: { icon: HeartPulse, tone: "bg-staff-3" },
  holistiskt: { icon: Sprout, tone: "bg-staff-4" },
  traning: { icon: Dumbbell, tone: "bg-staff-6" },
  tatuering: { icon: PenTool, tone: "bg-staff-1" },
  djur: { icon: PawPrint, tone: "bg-staff-3" },
  stad: { icon: SprayCan, tone: "bg-staff-5" },
  fordon: { icon: Car, tone: "bg-staff-4" },
  ovrigt: { icon: Star, tone: "bg-staff-1" },
};

export const ALL_ICON = LayoutGrid;
