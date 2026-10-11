// Bild till ett erbjudande via next/image. Servern släpper bara igenom lokala filer
// och projektets EGEN Supabase Storage (`safeImageUrl`, B1/#111 S3); för säkerhets skull görs
// samma kontroll här. Saknas bild visas en lugn pastellyta.
import Image from "next/image";

import { cn } from "@/components/ui/cn";
import { isOwnImageUrl } from "@/lib/media/storage-url";

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
  if (!src || !isOwnImageUrl(src)) {
    return (
      <div
        aria-hidden="true"
        className={cn("absolute inset-0 bg-lavender", className)}
      />
    );
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
