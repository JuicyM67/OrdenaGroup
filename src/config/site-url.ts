// Sajtens absoluta adress (canonical, sitemap, JSON-LD). `NEXT_PUBLIC_APP_URL` sätts per
// installation; annars används marknadens domän, och lokalt localhost.
import { brand } from "./brand";

export function siteOrigin(): string {
  const env = process.env.NEXT_PUBLIC_APP_URL;
  if (env) return env.replace(/\/$/, "");
  if (brand.domain) return `https://${brand.domain}`;
  return "http://localhost:3000";
}

export function absoluteUrl(path: string): string {
  return `${siteOrigin()}${path === "/" ? "" : path}`;
}
