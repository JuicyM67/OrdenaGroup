// LegalPage — cuerpo de `/legal/[doc]` (WP-26 paso 6). D-034: sin referencia dibujada
// propia, reutiliza tokens y el formspråk de las demás páginas del sitio (contenedor de
// ancho legible como `/preguntas`, `Card` para el banner de borrador). Server component
// puro (sin `"use client"`): no hay estado, los anclajes de la tabla de contenido son
// enlaces `#id` normales.
import { Card } from "@/components/ui/card";
import type { LegalBlock, LegalDoc } from "@/i18n/legal";

const linkClass =
  "text-13 font-semibold text-ink underline transition-colors duration-150 ease-out hover:text-pending-fg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink";

function LegalBlockView({ block }: { block: LegalBlock }) {
  if (block.type === "p") {
    return <p className="text-14 leading-relaxed text-ink">{block.text}</p>;
  }
  return (
    <ul className="flex flex-col gap-2">
      {block.items.map((item) => (
        <li key={item} className="flex items-start gap-2.5">
          <span
            aria-hidden="true"
            className="mt-2.5 size-1.25 shrink-0 rounded-full bg-ink"
          />
          <span className="text-14 leading-relaxed text-ink">{item}</span>
        </li>
      ))}
    </ul>
  );
}

export function LegalPage({
  doc,
  draftBanner,
  tocLabel,
}: {
  doc: LegalDoc;
  /** `null` cuando `doc.status === "final"` (WP-27): no se pinta ningún banner. */
  draftBanner: string | null;
  /** Encabezado de la tabla de contenido. */
  tocLabel: string;
}) {
  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col px-4 py-14 sm:px-8 sm:py-18">
      <h1 className="font-display text-30 font-semibold tracking-display text-ink sm:text-32 sm:font-bold">
        {doc.title}
      </h1>

      {draftBanner ? (
        <Card
          tone="peach"
          radius="card"
          padding="md"
          role="status"
          className="mt-6"
        >
          <p className="text-14 font-bold text-ink">{draftBanner}</p>
        </Card>
      ) : null}

      <div className="mt-8 flex flex-col gap-3">
        {doc.intro.map((block, i) => (
          <LegalBlockView key={i} block={block} />
        ))}
      </div>

      {doc.sections.length > 1 ? (
        <nav aria-label={tocLabel} className="mt-10 rounded-card bg-canvas p-5">
          <p className="text-13 font-bold tracking-caps text-ink uppercase">
            {tocLabel}
          </p>
          <ul className="mt-3 flex flex-col gap-2">
            {doc.sections.map((section) => (
              <li key={section.id}>
                <a href={`#${section.id}`} className={linkClass}>
                  {section.heading}
                </a>
              </li>
            ))}
          </ul>
        </nav>
      ) : null}

      <div className="mt-10 flex flex-col gap-10">
        {doc.sections.map((section) => (
          <section key={section.id} id={section.id} className="scroll-mt-20">
            <h2 className="text-18 font-bold text-ink">{section.heading}</h2>
            <div className="mt-3 flex flex-col gap-3">
              {section.blocks.map((block, i) => (
                <LegalBlockView key={i} block={block} />
              ))}
            </div>
          </section>
        ))}
      </div>

      <p className="mt-14 text-13 text-muted">{doc.versionLabel}</p>
    </div>
  );
}
