"use client";

// WP-47 (tillägg B): 24-timmarsklocka oavsett webbläsarens/OS:ets språk. Nativa
// `<input type="time">` visar AM/PM (och `<input type="date">` mm/dd/åååå) efter
// webbläsarens locale, inte appens (`es-CL`) — även med `lang="es-CL"` på
// `<html>` respekterar Chrome hellre operativsystemets språk för just den inbyggda
// klockan/kalender-widgeten. Ersätter widgeten med ett vanligt textfält och en enkel mask
// ("HH" → "HH:", högst 4 siffror) i stället för en 15-minuters `<select>`: `manual-
// booking-dialog.tsx`/scheduling tillåter fri minut (se dess filkommentar, "16:07"), en
// lista med steg hade tagit bort den möjligheten. Samma strängkontrakt som `input
// type="time"` gav (`"HH:mm"` i `value`/`onChange`), inga ändringar behövs i anropar-
// koden bortom att byta komponent.
import type { ChangeEvent, ComponentPropsWithoutRef, Ref } from "react";

export type Time24InputProps = Omit<
  ComponentPropsWithoutRef<"input">,
  "type" | "value" | "onChange"
> & {
  value: string;
  onChange: (e: ChangeEvent<HTMLInputElement>) => void;
  ref?: Ref<HTMLInputElement>;
};

/** "1530" → "15:30". Max 4 siffror, kolon infogas automatiskt efter de två första. */
export function maskTime24(raw: string): string {
  const digits = raw.replace(/\D/g, "").slice(0, 4);
  return digits.length <= 2
    ? digits
    : `${digits.slice(0, 2)}:${digits.slice(2)}`;
}

export function Time24Input({
  value,
  onChange,
  ref,
  ...props
}: Time24InputProps) {
  return (
    <input
      ref={ref}
      type="text"
      inputMode="numeric"
      autoComplete="off"
      placeholder="HH:MM"
      maxLength={5}
      value={value}
      onChange={(e) => {
        e.target.value = maskTime24(e.target.value);
        onChange(e);
      }}
      {...props}
    />
  );
}
