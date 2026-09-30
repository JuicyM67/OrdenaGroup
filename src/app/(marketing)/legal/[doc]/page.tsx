// /legal/[doc] (offentlig, WP-26 steg 6, D-034: ingen egen referensdesign). Statiska
// sidor för de tre policydokumenten (`LegalDocId`, `@/config/routes`), en per marknad:
// CL läser `privacidad`/`terminos`/`encargo` direkt, SE:s `/legal/integritet` osv.
// skrivs om (`next.config.ts`, `seRouteRewrites`) till samma sidfil med samma id, så
// `params.doc` är alltid en av de tre CL-namnen oavsett marknad (samma mönster som
// `/para/[industria]`). 404 för ett okänt dokument-id.
import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { LegalPage } from "@/components/legal/legal-page";
import { LEGAL_DOC_IDS, resolveLegalDoc } from "@/components/legal/resolve-doc";
import { SiteFooter } from "@/components/marketing/site-footer";
import { SiteHeader } from "@/components/marketing/site-header";
import { brand, market } from "@/config/brand";
import type { LegalDocId } from "@/config/routes";
import { LEGAL_DRAFT_BANNER } from "@/i18n/legal";

type PageParams = { doc: string };

export function generateStaticParams(): { doc: LegalDocId }[] {
  return LEGAL_DOC_IDS.map((doc) => ({ doc }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<PageParams>;
}): Promise<Metadata> {
  const { doc: id } = await params;
  const doc = resolveLegalDoc(id);
  if (!doc) return {};
  return { title: `${doc.title} — ${brand.name}` };
}

export default async function LegalDocPage({
  params,
}: {
  params: Promise<PageParams>;
}) {
  const { doc: id } = await params;
  const doc = resolveLegalDoc(id);
  if (!doc) notFound();

  const draftBanner =
    doc.status === "draft"
      ? LEGAL_DRAFT_BANNER[market === "SE" ? "sv-SE" : "es-CL"]
      : null;
  // TODO_COPY: ninguna clave de `src/i18n/` cubre hoy el rótulo de la tabla de
  // contenido de una página legal — placeholder claro hasta que copywriter-es-cl
  // agregue `sitio.legal.indice` (o equivalente) en `src/i18n/`.
  const tocLabel = market === "SE" ? "TODO_COPY: Innehåll" : "TODO_COPY: Contenido";

  return (
    <div className="flex min-h-dvh flex-col bg-canvas">
      <SiteHeader />
      <main className="flex-1">
        <LegalPage doc={doc} draftBanner={draftBanner} tocLabel={tocLabel} />
      </main>
      <SiteFooter />
    </div>
  );
}
