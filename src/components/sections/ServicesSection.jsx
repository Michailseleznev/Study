import { serviceFormats } from "../../data/siteContent";
import Bullets from "../ui/Bullets";
import SectionHead from "../ui/SectionHead";

export default function ServicesSection() {
  return (
    <section id="services">
      <div className="container">
        <SectionHead title="Форматы съёмки">
          Уличная, студийная и креативная съёмка, а также репортаж событий. Перед съёмкой помогу с идеей и образами.
        </SectionHead>

        <div className="grid">
          {serviceFormats.map((service) => (
            <div key={service.title} className="glass price-card reveal" style={{ gridColumn: "span 6" }}>
              <h3 style={{ marginBottom: 10 }}>{service.title}</h3>
              <p>{service.description}</p>
              <Bullets items={service.bullets} style={{ marginTop: 12 }} />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
