// Förhandsvisning av alla mejl- och SMS-mallar för aktuell marknad
// (`@/config/brand`), med exempeldata (`emailFixtures`/`smsFixtures`).
// Minimal sida (design-lab-skärmar ägs annars av ui-engineer, men detta
// arbetspaket äger sitt eget innehåll och får lägga en enkel page.tsx här).
// Mejlens HTML renderas i en `<iframe srcDoc>` (isolerad, samma sak som
// hur klienter faktiskt visar html-mejl), inte via `dangerouslySetInnerHTML`
// i sidans eget DOM.
import { market } from "@/config/brand";
import { emailFixtures } from "@/server/messaging/email/fixtures";
import {
  renderEmail,
  EMAIL_TEMPLATE_KIND,
  EMAIL_TEMPLATE_NAMES,
} from "@/server/messaging/email/render";
import { smsFixtures } from "@/server/messaging/sms/fixtures";
import { renderSms, SMS_TEMPLATE_NAMES } from "@/server/messaging/sms/render";

export default function EmailDesignLabPage() {
  const emails = emailFixtures(market);
  const smsData = smsFixtures(market);

  return (
    <main className="mx-auto flex max-w-240 flex-col gap-10 px-6 py-10 text-ink">
      <div>
        <h1 className="font-display text-32 font-bold tracking-display">
          Mejl &amp; SMS
        </h1>
        <p className="mt-2 text-14 text-muted">
          Marknad: {market}. Exempeldata, inga riktiga utskick (regel hård 8).
        </p>
      </div>

      <section className="flex flex-col gap-8">
        <h2 className="text-18 font-bold">Mejl</h2>
        {EMAIL_TEMPLATE_NAMES.map((template) => {
          const rendered = renderEmail(template, market, emails[template]);
          return (
            <article
              key={template}
              className="flex flex-col gap-2 rounded-card border border-line-strong p-4"
            >
              <div className="flex flex-wrap items-baseline gap-2">
                <h3 className="text-16 font-bold">{template}</h3>
                <span className="text-12 font-semibold text-muted">
                  {EMAIL_TEMPLATE_KIND[template]}
                </span>
              </div>
              <p className="text-14 font-semibold">{rendered.subject}</p>
              <p className="text-13 text-muted">{rendered.preheader}</p>
              <iframe
                title={`${template}-html`}
                srcDoc={rendered.html}
                className="h-175 w-full rounded-tile border border-line-strong"
              />
              <details>
                <summary className="cursor-pointer text-13 font-semibold text-muted">
                  Textversion
                </summary>
                <pre className="mt-2 text-13 whitespace-pre-wrap text-muted">
                  {rendered.text}
                </pre>
              </details>
            </article>
          );
        })}
      </section>

      <section className="flex flex-col gap-4">
        <h2 className="text-18 font-bold">SMS</h2>
        <div className="flex flex-wrap gap-4">
          {SMS_TEMPLATE_NAMES.map((template) => {
            const rendered = renderSms(template, market, smsData[template]);
            return (
              <article key={template} className="flex w-70 flex-col gap-2">
                <h3 className="text-14 font-bold">{template}</h3>
                <div className="rounded-panel bg-lime px-4 py-3 text-14 font-medium text-on-lime-soft">
                  {rendered.text}
                </div>
                <p className="text-12 text-muted">
                  {rendered.length} tecken · {rendered.encoding} ·{" "}
                  {rendered.segments}{" "}
                  {rendered.segments === 1 ? "segment" : "segment"}
                </p>
                {rendered.warning ? (
                  <p className="text-12 font-semibold text-alert">
                    {rendered.warning}
                  </p>
                ) : null}
              </article>
            );
          })}
        </div>
      </section>
    </main>
  );
}
