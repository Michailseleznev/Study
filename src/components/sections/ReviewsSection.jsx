import { reviews } from "../../data/siteContent";
import SectionHead from "../ui/SectionHead";

export default function ReviewsSection({ index, onSelect }) {
  return (
    <section id="reviews" className="tight">
      <div className="container">
        <SectionHead title="Отзывы">Отзывы клиентов после портретных, коммерческих и креативных съёмок.</SectionHead>

        <div className="t-wrap reveal">
          <div className="glass t-slider" aria-label="Слайдер отзывов">
            <div className="t-track" id="tTrack" style={{ transform: `translateX(-${index * 100}%)` }}>
              {reviews.map((review) => (
                <div key={`${review.author}-${review.role}`} className="glass t-card">
                  <div className="quote">{review.quote}</div>
                  <div className="who">
                    <strong>{review.author}</strong>
                    <span>{review.role}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="t-nav" id="tDots" aria-label="Навигация отзывов">
            {reviews.map((review, reviewIndex) => (
              <button
                key={`${review.author}-${review.role}-dot`}
                aria-label={`Показать отзыв ${reviewIndex + 1}`}
                className={`dot${reviewIndex === index ? " active" : ""}`}
                onClick={() => {
                  onSelect(reviewIndex);
                }}
                type="button"
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
