"use client";

// `onSaved` → `router.refresh()` (WP-55): las pestañas "Tu negocio"/"Reglas de
// reserva"/"Socios" editan la misma fila de `businesses` pero viven en rutas separadas
// ahora, así que no comparten un `useState(business)` como antes (`ajustes-screen.tsx`).
// En vez de que cada sección mantenga su propio estado "al día" para cosas que otra
// pestaña o el `AjustesShell` también usan (el link de reserva cambia si cambia el slug),
// se vuelve a pedir la página al servidor después de guardar — mismo recurso que ya usa
// `AjustesShell` para `NotificationBell`.
import { useRouter } from "next/navigation";
import type { ReactNode } from "react";

export function AjustesTabRefresh({
  children,
}: {
  children: (refresh: () => void) => ReactNode;
}) {
  const router = useRouter();
  return <>{children(() => router.refresh())}</>;
}
