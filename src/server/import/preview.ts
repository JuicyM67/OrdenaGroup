import "server-only";

/**
 * WP-66: Claudes extraktion → förhandsgranskningen ägaren ser (ren funktion,
 * testad i preview.test.ts). Sanerar allt: trimmar, kapar till DB-gränserna,
 * slänger orimliga längder/priser och ogiltiga öppettider, och markerar
 * tjänster/personal som redan finns (samma namn, skiftlägesokänsligt).
 */
import type { ImportHour, ImportPreview } from "@/lib/validation/import";
import { RUBRO_KEYS } from "@/server/onboarding/schemas";

import type { Extraction } from "./extraction-schema";

const HHMM = /^([01]\d|2[0-3]):[0-5]\d$/;

function clean(v: string | null | undefined, max: number): string {
  return (v ?? "").replace(/\s+/g, " ").trim().slice(0, max);
}

/** Behåller radbrytningar (om-texten), trimmar och kapar. */
function cleanMultiline(v: string | null | undefined, max: number): string {
  return (v ?? "")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim()
    .slice(0, max);
}

export function normalizeName(name: string): string {
  return name.trim().toLocaleLowerCase("und").replace(/\s+/g, " ");
}

function toHours(raw: Extraction["hours"]): ImportHour[] {
  const byDay = new Map<number, ImportHour>();
  for (const h of raw) {
    if (!Number.isInteger(h.weekday) || h.weekday < 1 || h.weekday > 7) {
      continue;
    }
    if (byDay.has(h.weekday)) continue;
    const start = (h.start ?? "").trim().slice(0, 5);
    const end = (h.end ?? "").trim().slice(0, 5);
    const valid = h.open && HHMM.test(start) && HHMM.test(end) && start < end;
    byDay.set(h.weekday, {
      weekday: h.weekday as ImportHour["weekday"],
      open: valid,
      start: valid ? start : "",
      end: valid ? end : "",
    });
  }
  if (byDay.size === 0) return [];
  return [1, 2, 3, 4, 5, 6, 7].map(
    (d) =>
      byDay.get(d) ?? {
        weekday: d as ImportHour["weekday"],
        open: false,
        start: "",
        end: "",
      },
  );
}

export type ExistingNames = { services: string[]; staff: string[] };

export function toPreview(
  e: Extraction,
  platformName: string | null,
  existing: ExistingNames = { services: [], staff: [] },
): ImportPreview {
  const existingServices = new Set(existing.services.map(normalizeName));
  const existingStaff = new Set(existing.staff.map(normalizeName));
  const seenServices = new Set<string>();
  const seenStaff = new Set<string>();

  const services: ImportPreview["services"] = [];
  for (const s of e.services) {
    const name = clean(s.name, 120);
    const key = normalizeName(name);
    if (!name || seenServices.has(key)) continue;
    seenServices.add(key);
    const d = s.durationMin;
    const p = s.price;
    services.push({
      name,
      description: clean(s.description, 500),
      durationMin:
        d !== null && Number.isInteger(d) && d >= 5 && d <= 600
          ? String(d)
          : "",
      price:
        p !== null && Number.isInteger(p) && p >= 0 && p < 100_000_000
          ? String(p)
          : "",
      priceFrom: s.priceFrom,
      category: clean(s.category, 60),
      exists: existingServices.has(key),
    });
    if (services.length >= 50) break;
  }

  const staff: ImportPreview["staff"] = [];
  for (const st of e.staff) {
    const name = clean(st.name, 120);
    const key = normalizeName(name);
    if (!name || seenStaff.has(key)) continue;
    seenStaff.add(key);
    staff.push({
      name,
      title: clean(st.title, 100),
      exists: existingStaff.has(key),
    });
    if (staff.length >= 30) break;
  }

  const categoryNames = new Map<string, string>();
  for (const c of [...e.categories, ...services.map((s) => s.category)]) {
    const name = clean(c, 60);
    if (name && !categoryNames.has(normalizeName(name))) {
      categoryNames.set(normalizeName(name), name);
    }
  }

  const b = e.business;
  const category =
    b.category && (RUBRO_KEYS as readonly string[]).includes(b.category)
      ? b.category
      : "";

  return {
    platformName,
    confidence: e.confidence,
    notes: e.notes
      .map((n) => clean(n, 240))
      .filter(Boolean)
      .slice(0, 8),
    profile: {
      name: clean(b.name, 120),
      about: cleanMultiline(b.about, 1500),
      address: clean(b.address, 200),
      district: clean(b.district ?? b.city, 80),
      phone: clean(b.phone, 30),
      email: clean(b.email, 200),
      website: clean(b.website, 300),
      instagram: clean(b.instagram, 200),
      tiktok: clean(b.tiktok, 200),
      facebook: clean(b.facebook, 200),
      category,
    },
    hours: toHours(e.hours),
    categories: [...categoryNames.values()].slice(0, 30),
    services,
    staff,
    images: {
      logoUrl: httpsOrEmpty(e.images.logoUrl),
      coverUrl: httpsOrEmpty(e.images.coverUrl),
    },
  };
}

function httpsOrEmpty(v: string | null): string {
  if (!v) return "";
  try {
    const u = new URL(v.trim());
    return u.protocol === "https:" ? u.toString() : "";
  } catch {
    return "";
  }
}
