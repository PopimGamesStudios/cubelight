import type { LegalDocument } from "@/lib/legal";

export function LegalDocumentView({ document }: { document: LegalDocument }) {
  return (
    <article className="legal-doc">
      <header className="legal-head">
        <h2>{document.title}</h2>
        <span className="legal-effective">Effective {document.effective}</span>
        <p>{document.summary}</p>
      </header>

      {document.sections.map((section) => (
        <section className="legal-section" key={section.title}>
          <h3>{section.title}</h3>
          {section.paragraphs?.map((paragraph) => (
            <p key={paragraph}>{paragraph}</p>
          ))}
          {section.bullets?.length ? (
            <ul>
              {section.bullets.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          ) : null}
        </section>
      ))}
    </article>
  );
}
