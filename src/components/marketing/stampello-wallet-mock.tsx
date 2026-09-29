// Mockup de la tarjeta de wallet de Stampello (WP-fixar-sv), ver `.visual-diff/ref/
// stampello-wallet.jpg`: círculo de logo, nombre del negocio, "SELLOS X/8", el premio y un
// QR. Recreación con nuestros tokens (peach/lime/ink), nunca el naranjo de Stampello — y
// puramente decorativa (`aria-hidden`, el texto real vive en `PartnerStampello`).
// Animaciones (tokens.css): la tarjeta sale de la pila (`animate-wallet-rise`, una vez), un
// sello se agrega 5/8 → 6/8 con pop (`animate-wallet-stamp-out/-in`, loop) y el QR pulsa
// suave (`animate-wallet-qr-pulse`, loop). `prefers-reduced-motion` las congela en el
// estado final (src/app/globals.css).
import { QrCode } from "lucide-react";

import { Avatar } from "@/components/ui/avatar";
import { Card } from "@/components/ui/card";
import { strokeCard } from "@/components/ui/icons";
import { copy } from "@/i18n/marketing";
import { initialsOf } from "@/lib/format/initials";

import { DEMO } from "./demo-data";

const T = copy.sitio.partner.stampello.tarjeta;
const SELLOS_TOTAL = 8;

export function StampelloWalletMock() {
  return (
    <div
      aria-hidden="true"
      className="relative hidden h-52 w-60 shrink-0 lg:block"
    >
      <div className="absolute inset-x-3 top-3 h-46 -rotate-6 rounded-tile bg-lilac-100" />
      <div className="absolute inset-x-1.5 top-1.5 h-46 rotate-3 rounded-tile bg-lime-50" />
      <Card
        tone="peach"
        radius="tile"
        padding="lg"
        className="relative flex h-46 animate-wallet-rise flex-col gap-3"
      >
        <div className="flex items-center justify-between gap-2">
          <div className="flex min-w-0 items-center gap-2">
            <Avatar
              shape="circle"
              size={36}
              tone="sky"
              initials={initialsOf(DEMO.walletNegocio)}
            />
            <span className="truncate text-13 font-bold text-ink">
              {DEMO.walletNegocio}
            </span>
          </div>
          <div className="shrink-0 text-right">
            <div className="text-10 font-bold tracking-caps text-muted uppercase">
              {T.sellosEtiqueta}
            </div>
            <div className="relative h-5 w-9">
              <span className="absolute inset-y-0 right-0 animate-wallet-stamp-out text-15 font-bold text-ink">
                5/{SELLOS_TOTAL}
              </span>
              <span className="absolute inset-y-0 right-0 animate-wallet-stamp-in text-15 font-bold text-ink">
                6/{SELLOS_TOTAL}
              </span>
            </div>
          </div>
        </div>

        <div>
          <div className="text-10 font-bold tracking-caps text-muted uppercase">
            {T.premioEtiqueta({ n: SELLOS_TOTAL })}
          </div>
          <div className="text-16 font-bold text-ink">{DEMO.walletPremio}</div>
        </div>

        <div className="mt-auto flex justify-center">
          <span className="flex size-14 animate-wallet-qr-pulse items-center justify-center rounded-control bg-surface text-ink">
            <QrCode
              aria-hidden="true"
              className="size-9"
              strokeWidth={strokeCard}
            />
          </span>
        </div>
      </Card>
    </div>
  );
}
