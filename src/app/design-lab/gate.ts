// Design lab är bara till för utveckling (FRÅGA 8). ARCHITECTURE säger "bara i dev", men
// npm run visual och e2e körs mot `next start` (produktionsbuild), så gatingen sker på
// VERCEL_ENV i stället för NODE_ENV. Öppet lokalt, i CI och i preview.
//
// Vercels "production"-miljö är delad mellan riktig produktion och staging (WP-05): samma
// VERCEL_ENV="production" i båda. DESIGN_LAB="1" öppnar labbet i den miljön ändå — sätts bara
// som Vercel-miljövariabel i staging-projektet, aldrig i riktig produktion (se
// docs/tech/STAGING.md). Utan flaggan gäller samma regel som tidigare: stängt bara i production.
export type DesignLabEnv = {
  VERCEL_ENV?: string;
  DESIGN_LAB?: string;
};

export function isDesignLabEnabled(env: DesignLabEnv): boolean {
  if (env.VERCEL_ENV === "production") {
    return env.DESIGN_LAB === "1";
  }
  return true;
}
