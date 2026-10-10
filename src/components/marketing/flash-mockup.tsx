// Hora Flash-mockup (WP-hemsida, retro: sektionen mappad om från
// `.visual-diff/ref/sida-v1-bento.html`, punkt "HORAS FLASH"): fyra staplade tillstånd i
// samma glaskort — en ledig tid (mörk), sedan rabatt-brickan (lime), sedan avisot till
// kunderna, sedan "¡Reservada por {nombre}!" — med samma teknik som FlujoMockup (en
// färdigfasad `animate-step-fade-N` per tillstånd, tokens.css). `copy.sitio.inicio.flash.mock`
// är etiketter för den här maquetan, inte riktiga WhatsApp-mallar (de lever i
// `plantillasWhatsapp`). Kortet ligger ovanpå ett foto (`flash-band.tsx`), därför den
// halvtransparenta `bg-dark-2/75` + `backdrop-blur-glass` i stället för en solid `tone="dark"`.
// Rent dekorativ (`aria-hidden`).
//
// `className` (sitio-v6, /horas-flash): valfri, sammanslås via `cn()` så anroparen kan byta
// storlek (t.ex. `h-72 max-w-lg` i heron) utan att duplicera resten av kortet. Standardanropet
// i `flash-band.tsx` är oförändrat (ingen `className`, samma mått som förut).
import { Bell, Check, Clock, Zap } from "lucide-react";

import { Card } from "@/components/ui/card";
import { Chip } from "@/components/ui/chip";
import { cn } from "@/components/ui/cn";
import { strokeCard } from "@/components/ui/icons";
import { copy } from "@/i18n/marketing";

import { DEMO } from "./demo-data";

const STEP_ANIMATIONS = [
  "animate-step-fade-1",
  "animate-step-fade-2",
  "animate-step-fade-3",
  "animate-step-fade-4",
] as const;

const MOCK = copy.sitio.inicio.flash.mock;

function EstadoHoraLibre({
  conDescuento,
  conAviso,
}: {
  conDescuento?: boolean;
  conAviso?: boolean;
}) {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-3 rounded-tile bg-dark-2 px-4 py-3.5">
        <Clock
          aria-hidden="true"
          className="size-5 shrink-0 text-lime"
          strokeWidth={strokeCard}
        />
        <span className="flex-1 text-15 font-bold text-on-dark">
          {MOCK.horaLibre({ hora: "17:30" })}
        </span>
        {conDescuento ? (
          <Chip tone="lime" size="sm" weight="bold">
            {MOCK.descuento({ pct: 20 })}
          </Chip>
        ) : null}
      </div>
      {conAviso ? (
        <div className="flex items-center gap-2.5 rounded-tile bg-dark-2 px-4 py-3 text-13 font-semibold text-on-dark-soft">
          <Bell
            aria-hidden="true"
            className="size-4 shrink-0 text-lime"
            strokeWidth={strokeCard}
          />
          {MOCK.notificacion({ n: 84 })}
        </div>
      ) : null}
    </div>
  );
}

function EstadoReservada() {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-2 text-center">
      <span className="flex size-12 items-center justify-center rounded-full bg-lime text-ink">
        <Check aria-hidden="true" className="size-6" strokeWidth={strokeCard} />
      </span>
      <span className="text-17 font-bold text-on-dark">
        {copy.sitio.inicio.flash.reservadaPor({ nombre: DEMO.kund })}
      </span>
    </div>
  );
}

export function FlashMockup({ className }: { className?: string }) {
  return (
    <Card
      tone="dark"
      radius="hero"
      padding="xl"
      aria-hidden="true"
      className={cn(
        "relative h-64 w-full max-w-md overflow-hidden border border-dark-border bg-dark-2/75 backdrop-blur-glass",
        className,
      )}
    >
      <span className="flex size-11 items-center justify-center rounded-full bg-lime text-ink">
        <Zap aria-hidden="true" className="size-5.5" strokeWidth={strokeCard} />
      </span>
      <div
        className={cn(
          "absolute inset-x-8 top-22 flex flex-col",
          STEP_ANIMATIONS[0],
        )}
      >
        <EstadoHoraLibre />
      </div>
      <div
        className={cn(
          "absolute inset-x-8 top-22 flex flex-col",
          STEP_ANIMATIONS[1],
        )}
      >
        <EstadoHoraLibre conDescuento />
      </div>
      <div
        className={cn(
          "absolute inset-x-8 top-22 flex flex-col",
          STEP_ANIMATIONS[2],
        )}
      >
        <EstadoHoraLibre conDescuento conAviso />
      </div>
      <div
        className={cn("absolute inset-x-8 top-16 bottom-8", STEP_ANIMATIONS[3])}
      >
        <EstadoReservada />
      </div>
    </Card>
  );
}
