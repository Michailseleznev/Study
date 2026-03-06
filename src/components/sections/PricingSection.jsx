import { pricingPlans } from "../../data/siteContent";
import Bullets from "../ui/Bullets";
import SectionHead from "../ui/SectionHead";

export default function PricingSection({ expandedPlans, onTogglePlan }) {
  return (
    <section id="pricing">
      <div className="container">
        <SectionHead title="Цены">Прозрачные условия и понятные пакеты — выбери подходящий формат и оставь заявку ниже.</SectionHead>

        <div className="glass pricing reveal">
          <div className="pricing-grid">
            {pricingPlans.map((plan) => {
              const isExpanded = Boolean(expandedPlans[plan.title]);
              return (
                <div
                  key={plan.title}
                  className={`glass price-card${isExpanded ? " expanded" : ""}`}
                  data-expand="price"
                  onClick={() => {
                    onTogglePlan(plan.title);
                  }}
                  onKeyDown={(event) => {
                    if (event.key !== "Enter" && event.key !== " ") return;
                    event.preventDefault();
                    onTogglePlan(plan.title, true);
                  }}
                  role="button"
                  tabIndex={0}
                  style={plan.featured ? { background: "var(--panel-strong)", borderColor: "rgba(14,15,18,0.16)" } : undefined}
                >
                  <div className="price-title">
                    <h3>{plan.title}</h3>
                    <div className="rub">{plan.price}</div>
                  </div>

                  <Bullets items={plan.bullets} />

                  <div className="price-more">
                    <Bullets items={plan.extra} style={{ marginTop: 12 }} />
                  </div>

                  <div className="price-hint">
                    <i></i> Наведи / нажми — детали
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
