// Design lab är bara till för utveckling (FRÅGA 8). ARCHITECTURE säger "bara i dev", men
// npm run visual och e2e körs mot `next start` (produktionsbuild), så gatingen sker på
// VERCEL_ENV i stället för NODE_ENV. Öppet lokalt, i CI och i preview.
export type DesignLabEnv = {
  VERCEL_ENV?: string;
};

export function isDesignLabEnabled(env: DesignLabEnv): boolean {
  return env.VERCEL_ENV !== "production";
}
