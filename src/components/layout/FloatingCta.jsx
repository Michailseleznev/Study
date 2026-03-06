import { floatingCtas } from "../../data/siteContent";
import SmartLink from "../ui/SmartLink";

export default function FloatingCta({ prefersReducedMotion, trackEvent }) {
  return (
    <div className="floating-cta" aria-label="Быстрая запись">
      {floatingCtas.map((link, index) => (
        <SmartLink
          key={link.label}
          className={index === 0 ? "btn primary" : "btn"}
          external={link.external}
          href={link.href}
          prefersReducedMotion={prefersReducedMotion}
          trackEvent={trackEvent}
          trackName="cta_click"
        >
          {link.label}
        </SmartLink>
      ))}
    </div>
  );
}
