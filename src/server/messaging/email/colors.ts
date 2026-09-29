import "server-only";

/**
 * Färger för HTML-mejl, som rå hex-värden. E-postklienter (Outlook, Gmail-
 * appen …) stödjer varken CSS custom properties eller Tailwind-klasser, så
 * `src/styles/tokens.css` kan inte importeras här — D-015/regel hård 1
 * gäller ändå i sak: varje värde nedan är kopierat från en namngiven token
 * i `tokens.css`, aldrig påhittat. `colors.test.ts` läser `tokens.css` och
 * misslyckas om värdena glider isär.
 */
export const emailColors = {
  ink: "#16161A",
  dark: "#1C1C22",
  darkLine: "#33333B",
  canvas: "#F4F4F0",
  surface: "#FFFFFF",
  border: "#E2E2DC",
  line: "#F1F1EE",
  muted: "#5E5E66",
  subtle: "#A3A3AB",
  onDark: "#FFFFFF",
  onDarkSoft: "#D2D2D9",
  onDarkMuted: "#B9B9C2",
  lime: "#E3F36B",
  onLimeSoft: "#2F3310",
  lilac: "#C9B8F5",
  onLilacSoft: "#2E2A3D",
  peach: "#F5DEC0",
  onPeachSoft: "#3D3020",
  peach50: "#FBEBD6",
  successBg: "#D5EEDC",
  successFg: "#1F6B3A",
  depositBg: "#FBEBD6",
  depositFg: "#7A4A12",
  alert: "#E0592A",
} as const;

export type EmailColorName = keyof typeof emailColors;
