// Bild till ett erbjudande: lokala filer (`/marketing`, `/demo`) via next/image,
// externa (https, Storage) utan optimering så att ingen bildvärd behöver
// whitelistas. Saknas bild visas en lugn pastellyta.
import Image from "next/image";

import { cn } from "@/components/ui/cn";

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
  if (!src) {
    return <div aria-hidden="true" className={cn("bg-lavender", className)} />;
  }
  return (
    <Image
      src={src}
      alt={alt}
      fill
      sizes={sizes}
      priority={priority}
      unoptimized={src.startsWith("https://")}
      className={cn("object-cover", className)}
    />
  );
}
