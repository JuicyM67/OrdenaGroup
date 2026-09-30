"use client";

// Tvåstegsverifiering för /admin (F19/WP-36, D-038): TOTP via Supabase Auth
// MFA, körs helt klient-side (enroll/challengeAndVerify) — servern gör bara
// `requireAdminAnyAal()` (finns personen i platform_admins) innan den här
// panelen ens renderas. Svensk text (bara ägaren använder ytan).
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { TextField } from "@/components/ui/text-field";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

type Estado =
  | { fas: "laddar" }
  | { fas: "redan-klar" }
  | { fas: "registrera"; factorId: string; qr: string; secret: string }
  | { fas: "verifiera"; factorId: string }
  | { fas: "fel"; meddelande: string };

export function MfaPanel() {
  const router = useRouter();
  const [estado, setEstado] = useState<Estado>({ fas: "laddar" });
  const [kod, setKod] = useState("");
  const [skickar, setSkickar] = useState(false);
  const [verifieringsfel, setVerifieringsfel] = useState<string | null>(null);

  useEffect(() => {
    let avbruten = false;

    async function init() {
      const supabase = createSupabaseBrowserClient();
      const { data: aal, error: aalError } =
        await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
      if (avbruten) return;
      if (aalError) {
        setEstado({
          fas: "fel",
          meddelande: "Kunde inte läsa din verifieringsnivå. Ladda om sidan.",
        });
        return;
      }
      if (aal.currentLevel === "aal2") {
        router.replace("/admin");
        return;
      }

      const { data: factors, error: factorsError } =
        await supabase.auth.mfa.listFactors();
      if (avbruten) return;
      if (factorsError) {
        setEstado({
          fas: "fel",
          meddelande: "Kunde inte läsa dina faktorer. Ladda om sidan.",
        });
        return;
      }

      const verifierad = factors.totp[0];
      if (verifierad) {
        setEstado({ fas: "verifiera", factorId: verifierad.id });
        return;
      }

      const { data: enrolled, error: enrollError } =
        await supabase.auth.mfa.enroll({ factorType: "totp" });
      if (avbruten) return;
      if (enrollError || !enrolled) {
        setEstado({
          fas: "fel",
          meddelande:
            enrollError?.message ?? "Kunde inte starta registreringen.",
        });
        return;
      }
      setEstado({
        fas: "registrera",
        factorId: enrolled.id,
        qr: enrolled.totp.qr_code,
        secret: enrolled.totp.secret,
      });
    }

    void init();
    return () => {
      avbruten = true;
    };
  }, [router]);

  async function verifiera(factorId: string) {
    setSkickar(true);
    setVerifieringsfel(null);
    try {
      const supabase = createSupabaseBrowserClient();
      const { error } = await supabase.auth.mfa.challengeAndVerify({
        factorId,
        code: kod.trim(),
      });
      if (error) {
        setVerifieringsfel(error.message || "Fel kod. Försök igen.");
        setSkickar(false);
        return;
      }
      router.replace("/admin");
    } catch {
      setVerifieringsfel("Kunde inte verifiera koden. Försök igen.");
      setSkickar(false);
    }
  }

  if (estado.fas === "laddar" || estado.fas === "redan-klar") {
    return <p className="text-14 text-ink-soft">Laddar…</p>;
  }

  if (estado.fas === "fel") {
    return <p className="text-14 text-alert">{estado.meddelande}</p>;
  }

  const factorId = estado.factorId;

  return (
    <div className="flex flex-col gap-5">
      {estado.fas === "registrera" ? (
        <div className="flex flex-col gap-3">
          <p className="text-14 text-ink">
            Skanna QR-koden med din autentiseringsapp (t.ex. Google
            Authenticator eller 1Password).
          </p>
          {/* eslint-disable-next-line @next/next/no-img-element -- QR-koden är en data-URL (SVG) från Supabase, ingen extern bild att optimera. */}
          <img
            src={estado.qr}
            alt="QR-kod för tvåstegsverifiering"
            className="size-48 self-center rounded-card bg-surface p-2"
          />
          <p className="text-12 text-ink-soft">
            Går inte att skanna? Skriv in koden manuellt: {estado.secret}
          </p>
        </div>
      ) : (
        <p className="text-14 text-ink">
          Skriv koden från din autentiseringsapp.
        </p>
      )}

      <form
        className="flex flex-col gap-3"
        onSubmit={(e) => {
          e.preventDefault();
          void verifiera(factorId);
        }}
      >
        <TextField
          label="Kod"
          inputMode="numeric"
          autoComplete="one-time-code"
          value={kod}
          onChange={(e) => setKod(e.target.value)}
          error={verifieringsfel ?? undefined}
        />
        <Button type="submit" size="xl" disabled={skickar || kod.trim() === ""}>
          {skickar ? "Verifierar…" : "Verifiera"}
        </Button>
      </form>
    </div>
  );
}
