import { describe, expect, it } from "vitest";

import { poolConfig } from "./pool";

const CA = "-----BEGIN CERTIFICATE-----\nMIIBfake\n-----END CERTIFICATE-----";
const REMOTE =
  "postgresql://postgres.abc:hemligt-losen@aws-0-sa-east-1.pooler.supabase.com:6543/postgres";

describe("poolConfig (TLS, R4)", () => {
  it.each(["127.0.0.1", "localhost"])("lokal värd %s: ingen TLS", (host) => {
    const c = poolConfig({
      DATABASE_URL: `postgresql://postgres:postgres@${host}:54322/postgres`,
    });
    expect(c.ssl).toBeUndefined();
    expect(c.max).toBe(3);
  });

  it("annan värd utan DATABASE_CA_CERT: vägrar starta, utan URL/lösenord i felet", () => {
    let message = "";
    try {
      poolConfig({ DATABASE_URL: REMOTE });
    } catch (e) {
      message = (e as Error).message;
    }
    expect(message).toMatch(/DATABASE_CA_CERT/);
    expect(message).not.toMatch(/hemligt|pooler|postgres\./);
  });

  it("annan värd med något som inte är PEM: vägrar starta", () => {
    expect(() =>
      poolConfig({ DATABASE_URL: REMOTE, DATABASE_CA_CERT: "inte ett cert" }),
    ).toThrow(/PEM/);
  });

  it("annan värd med CA: verifierad TLS (rejectUnauthorized) och ssl-parametrar i URL:en tas bort", () => {
    const c = poolConfig({
      DATABASE_URL: `${REMOTE}?sslmode=require&sslrootcert=/tmp/x&application_name=app`,
      DATABASE_CA_CERT: CA,
    });
    expect(c.ssl).toEqual({ ca: CA, rejectUnauthorized: true });
    expect(c.connectionString).not.toMatch(/ssl/i);
    expect(c.connectionString).toMatch(/application_name=app/);
  });

  it("CA med \\n som text (env på en rad) blir riktiga radbrytningar", () => {
    const c = poolConfig({
      DATABASE_URL: REMOTE,
      DATABASE_CA_CERT: CA.replace(/\n/g, "\\n"),
    });
    expect(c.ssl).toEqual({ ca: CA, rejectUnauthorized: true });
  });

  it("saknad eller ogiltig DATABASE_URL", () => {
    expect(() => poolConfig({})).toThrow(/DATABASE_URL saknas/);
    expect(() => poolConfig({ DATABASE_URL: "inte en url" })).toThrow(
      /inte en giltig URL/,
    );
  });

  it("DATABASE_POOL_MAX inom 1–20, annars standard", () => {
    const url = "postgresql://postgres:postgres@127.0.0.1:54322/postgres";
    expect(poolConfig({ DATABASE_URL: url, DATABASE_POOL_MAX: "8" }).max).toBe(
      8,
    );
    expect(poolConfig({ DATABASE_URL: url, DATABASE_POOL_MAX: "0" }).max).toBe(
      3,
    );
    expect(poolConfig({ DATABASE_URL: url, DATABASE_POOL_MAX: "x" }).max).toBe(
      3,
    );
  });
});
