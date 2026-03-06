import { trustItems } from "../../data/siteContent";
import SectionHead from "../ui/SectionHead";

export default function TrustSection() {
  return (
    <section id="trust" className="tight">
      <div className="container">
        <SectionHead title="Почему мне доверяют">
          Прозрачный процесс, понятные сроки и результат, который можно использовать сразу после съёмки.
        </SectionHead>
        <div className="grid">
          {trustItems.map((item) => (
            <article key={item.title} className="glass price-card reveal" style={{ gridColumn: "span 4" }}>
              <h3>{item.title}</h3>
              <p>{item.description}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
