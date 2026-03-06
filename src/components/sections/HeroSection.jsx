import { heroContent } from "../../data/siteContent";
import SmartLink from "../ui/SmartLink";

export default function HeroSection({ dynamicWord, prefersReducedMotion, trackEvent }) {
  return (
    <section className="hero">
      <div className="container hero-grid">
        <div>
          <div className="chip reveal">
            <i></i> {heroContent.chip}
          </div>

          <h1 className="reveal holo" style={{ marginTop: 16 }}>
            {heroContent.titleLines[0]}
            <br />
            {heroContent.titleLines[1]}
            <br />
            <span id="dyn" style={{ opacity: 0.85, fontSize: ".52em", letterSpacing: ".10em" }}>
              {dynamicWord}
            </span>
          </h1>

          <p className="lead reveal">{heroContent.lead}</p>

          <div className="hero-cta reveal">
            <SmartLink
              className="btn primary magnetic"
              href="#contact"
              prefersReducedMotion={prefersReducedMotion}
              trackEvent={trackEvent}
              trackName="cta_click"
            >
              Записаться
            </SmartLink>
            <SmartLink
              className="btn magnetic"
              href="#portfolio"
              prefersReducedMotion={prefersReducedMotion}
              trackEvent={trackEvent}
              trackName="cta_click"
            >
              Посмотреть работы
            </SmartLink>
          </div>

          <p className="reveal" style={{ marginTop: 18, fontSize: "0.95rem" }}>
            {heroContent.note}
          </p>
        </div>

        <div className="hero-media reveal" aria-label="Главная фотография">
          <img
            id="heroImg"
            src={heroContent.image.src}
            srcSet={heroContent.image.srcSet}
            sizes={heroContent.image.sizes}
            width={heroContent.image.width}
            height={heroContent.image.height}
            decoding="async"
            fetchPriority="high"
            alt={heroContent.image.alt}
          />
          <div className="corners" aria-hidden="true">
            <span className="tl"></span>
            <span className="tr"></span>
            <span className="br"></span>
            <span className="bl"></span>
          </div>
        </div>
      </div>
    </section>
  );
}
