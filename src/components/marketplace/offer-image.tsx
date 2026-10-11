// Bild till ett erbjudande via next/image. Servern släpper bara igenom lokala filer
// och projektets Supabase Storage (`safeImageUrl`, B1); för säkerhets skull görs
// samma kontroll här. Saknas bild visas en lugn pastellyta.
import Image from "next/image";

import { cn } from "@/components/ui/cn";

const ALLOWED =
  /^(\/(?!\/)|https:\/\/[a-z0-9]+\.supabase\.co\/storage\/v1\/object\/public\/(offer-images|business-media)\/)/;

export function OfferImage({
  src,
  alt,
  sizes,
  priority = false,
  className,
}: {
  src: string | null;
  alt: string;
  sizes: string;
  priority?: boolean;
  className?: string;
}) {
  if (!src || !ALLOWED.test(src)) {
    return <div aria-hidden="true" className={cn("bg-lavender", className)} />;
  }
  return (
    <Image
      src={src}
      alt={alt}
      fill
      sizes={sizes}
      priority={priority}
      className={cn("object-cover", className)}
    />
  );
}
