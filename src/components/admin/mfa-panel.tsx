"use client";

// Tvåstegsverifiering för /admin (F19/WP-36, D-038): TOTP via Supabase Auth
// MFA, körs helt klient-side (enroll/challengeAndVerify) — servern gör bara
// `requireAdminAnyAal()` (finns personen i platform_admins) innan den här
// panelen ens renderas. Text via `adminPanel.mfa`; appens namn i
// autentiseringsappen kommer från `brand.name` (issuer).
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { TextField } from "@/components/ui/text-field";
import { brand } from "@/config/brand";
import { adminPanel } from "@/i18n";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

const t = adminPanel.mfa;

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
          meddelande: t.errorNivel,
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
          meddelande: t.errorFactores,
        });
        return;
      }

      const verifierad = factors.totp[0];
      if (verifierad) {
        setEstado({ fas: "verifiera", factorId: verifierad.id });
        return;
      }

      // En tidigare påbörjad men aldrig verifierad faktor (sidan laddades om
      // innan koden skrevs) tas bort först: med ett fast `friendlyName` skulle
      // `enroll` annars ge `mfa_factor_name_conflict`. Går bara på overifierade
      // faktorer — verifierade hanteras ovan.
      for (const f of factors.all) {
        if (f.factor_type === "totp" && f.status === "unverified") {
          await supabase.auth.mfa.unenroll({ factorId: f.id });
        }
      }
      if (avbruten) return;

      const { data: enrolled, error: enrollError } =
        await supabase.auth.mfa.enroll({
          factorType: "totp",
          issuer: brand.name,
          friendlyName: t.nombreFactor({ marca: brand.name }),
        });
      if (avbruten) return;
      if (enrollError || !enrolled) {
        setEstado({ fas: "fel", meddelande: t.errorRegistro });
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
        setVerifieringsfel(
          error.code === "mfa_verification_failed"
            ? t.codigoIncorrecto
            : t.errorVerificar,
        );
        setSkickar(false);
        return;
      }
      router.replace("/admin");
    } catch {
      setVerifieringsfel(t.errorVerificar);
      setSkickar(false);
    }
  }

  if (estado.fas === "laddar" || estado.fas === "redan-klar") {
    return <p className="text-14 text-ink-soft">{t.cargando}</p>;
  }

  if (estado.fas === "fel") {
    return <p className="text-14 text-alert">{estado.meddelande}</p>;
  }

  const factorId = estado.factorId;

  return (
    <div className="flex flex-col gap-5">
      {estado.fas === "registrera" ? (
        <div className="flex flex-col gap-3">
          <p className="text-14 text-ink">{t.escanear}</p>
          {/* eslint-disable-next-line @next/next/no-img-element -- QR-koden är en data-URL (SVG) från Supabase, ingen extern bild att optimera. */}
          <img
            src={estado.qr}
            alt={t.qrAlt}
            className="size-48 self-center rounded-card bg-surface p-2"
          />
          <p className="text-12 text-ink-soft">
            {t.manual({ secreto: estado.secret })}
          </p>
        </div>
      ) : (
        <p className="text-14 text-ink">{t.escribeCodigo}</p>
      )}

      <form
        className="flex flex-col gap-3"
        onSubmit={(e) => {
          e.preventDefault();
          void verifiera(factorId);
        }}
      >
        <TextField
          label={t.codigo}
          inputMode="numeric"
          autoComplete="one-time-code"
          value={kod}
          onChange={(e) => setKod(e.target.value)}
          error={verifieringsfel ?? undefined}
        />
        <Button type="submit" size="xl" disabled={skickar || kod.trim() === ""}>
          {skickar ? t.verificando : t.verificar}
        </Button>
      </form>
    </div>
  );
}
