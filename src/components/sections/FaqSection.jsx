import { faqItems } from "../../data/siteContent";
import SectionHead from "../ui/SectionHead";

export default function FaqSection({ onToggle }) {
  return (
    <section id="faq">
      <div className="container">
        <SectionHead title="FAQ">Заранее проговорим задачу, стиль и сроки — чтобы на съёмке было спокойно и понятно.</SectionHead>

        <div className="faq">
          {faqItems.map((item) => (
            <details
              key={item.question}
              className="glass qa reveal"
              onToggle={(event) => {
                const target = event.currentTarget;
                target.classList.toggle("open", target.open);
                onToggle(item.question, target.open);
              }}
            >
              <summary className="q">
                <span className="q-title">{item.question}</span>
                <span className="chev" aria-hidden="true"></span>
              </summary>
              <div className="a">{item.answer}</div>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}
