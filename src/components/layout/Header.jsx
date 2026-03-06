import { navigationLinks, serviceMenuLinks } from "../../data/siteContent";
import SmartLink from "../ui/SmartLink";

export default function Header({
  activeSectionId,
  isServicesOpen,
  onCloseServices,
  onOpenBooking,
  onOpenDrawer,
  onToggleServices,
  prefersReducedMotion,
  servicesRef,
  trackEvent
}) {
  return (
    <header>
      <div className="container nav">
        <div className="logo">Mellow photos</div>

        <nav className="navlinks" aria-label="Основная навигация">
          <SmartLink
            className={activeSectionId === "portfolio" ? "nav-active" : undefined}
            href="#portfolio"
            prefersReducedMotion={prefersReducedMotion}
            trackEvent={trackEvent}
          >
            Портфолио
          </SmartLink>

          <div className={`dropdown${isServicesOpen ? " open" : ""}`} id="servicesDrop" ref={servicesRef}>
            <a
              className={`dropbtn${activeSectionId === "services" ? " nav-active" : ""}`}
              href="#services"
              aria-haspopup="true"
              aria-expanded={isServicesOpen}
              id="servicesBtn"
              onClick={(event) => {
                event.preventDefault();
                onToggleServices();
              }}
            >
              Услуги
            </a>
            <div className="menu" role="menu" aria-label="Услуги">
              {serviceMenuLinks.map((link) => (
                <SmartLink
                  key={`${link.label}-${link.meta}`}
                  href={link.href}
                  onNavigate={onCloseServices}
                  prefersReducedMotion={prefersReducedMotion}
                  role="menuitem"
                  trackEvent={trackEvent}
                >
                  {link.label}
                  <small>{link.meta}</small>
                </SmartLink>
              ))}
            </div>
          </div>

          {navigationLinks.slice(1).map((link) => (
            <SmartLink
              key={link.href}
              className={activeSectionId === link.href.replace("#", "") ? "nav-active" : undefined}
              href={link.href}
              prefersReducedMotion={prefersReducedMotion}
              trackEvent={trackEvent}
            >
              {link.label}
            </SmartLink>
          ))}
        </nav>

        <div className="nav-actions">
          <a
            className="btn primary magnetic"
            href="#"
            id="openBooking"
            onClick={(event) => {
              event.preventDefault();
              onOpenBooking("header");
            }}
          >
            Выбрать дату
          </a>
          <SmartLink
            className="btn magnetic"
            href="#portfolio"
            prefersReducedMotion={prefersReducedMotion}
            trackData={{ id: "header-portfolio" }}
            trackEvent={trackEvent}
            trackName="cta_click"
          >
            Посмотреть работы
          </SmartLink>
          <button className="iconbtn" type="button" id="openDrawer" aria-label="Открыть меню" onClick={onOpenDrawer}></button>
        </div>
      </div>
    </header>
  );
}
