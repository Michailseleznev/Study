import { footerLinks } from "../../data/siteContent";
import SmartLink from "../ui/SmartLink";

export default function Footer({ trackEvent }) {
  return (
    <footer>
      <div className="container foot">
        <div>
          <a href="/index.html" className="logo">
            Mellow photos
          </a>
          <div className="small">© 2026</div>
        </div>
        <div className="social" aria-label="Контакты">
          {footerLinks.map((link) => (
            <SmartLink key={link.label} className="magnetic" external={link.external} href={link.href} trackEvent={trackEvent} trackName="cta_click">
              {link.label}
            </SmartLink>
          ))}
        </div>
      </div>
    </footer>
  );
}
