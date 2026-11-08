// Stängd beta, bara på inbjudan (ägarens beslut 2026-11-09). Medan den är `true` kan ingen
// skapa ett NYTT företag utan en inbjudan från en plattformsadmin (/admin/nuevo):
// `/comenzar` visar beta-sidan, `/app` och `/app/onboarding` skickar konton utan företag
// till `/app/beta`, och `completeOnboarding` vägrar köra `create_business()` (utom för
// plattformsadmins). Teammedlemmar och inbjudna företag påverkas inte.
// Sätt till `false` för att öppna registreringen igen.
export const INVITE_ONLY_BETA: boolean = true;
