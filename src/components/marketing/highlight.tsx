// Markerat ord i en rubrik (lime eller lavendel pill). Ägarens regel: de markerade orden
// ligger ALLTID på en egen rad och bryts aldrig mitt i. Därför renderar komponenten själv
// radbrytningen före pillen, och pillen är `inline-block` + `whitespace-nowrap`. Använd den
// i varje H1/H2 med markering så att regeln gäller på hela sajten.
import type { ReactNode } from "react";

import { cn } from "@/components/ui/cn";

export function Highlight({
  children,
  tone = "lime",
  className,
}: {
  children: ReactNode;
  tone?: "lime" | "lilac";
  className?: string;
}) {
  return (
    <>
      <br />
      <span
        className={cn(
          "mt-1.5 inline-block rounded-highlight px-2.5 whitespace-nowrap text-ink",
          tone === "lime" ? "bg-lime" : "bg-lilac",
          className,
        )}
      >
        {children}
      </span>
    </>
  );
}
