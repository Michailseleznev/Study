import { drawerLinks } from "../../data/siteContent";
import SmartLink from "../ui/SmartLink";

export default function Drawer({
  drawerRef,
  isOpen,
  onClose,
  onOpenBooking,
  prefersReducedMotion,
  trackEvent
}) {
  return (
    <>
      <div className={`backdrop${isOpen ? " open" : ""}`} id="backdrop" aria-hidden={!isOpen} onClick={onClose}></div>
      <aside
        className={`drawer${isOpen ? " open" : ""}`}
        id="drawer"
        aria-label="Мобильное меню"
        aria-hidden={!isOpen}
        ref={drawerRef}
      >
        <div className="drawer-top">
          <div className="logo">Mellow photos</div>
          <button className="drawer-close" type="button" id="closeDrawer" aria-label="Закрыть меню" onClick={onClose}></button>
        </div>
        {drawerLinks.slice(0, 5).map((link) => (
          <SmartLink
            key={link.href}
            className="magnetic"
            href={link.href}
            onNavigate={onClose}
            prefersReducedMotion={prefersReducedMotion}
            trackEvent={trackEvent}
          >
            {link.label}
          </SmartLink>
        ))}
        <a
          className="btn primary magnetic"
          href="#"
          id="openBooking2"
          onClick={(event) => {
            event.preventDefault();
            onOpenBooking("drawer");
          }}
          style={{ justifyContent: "center" }}
        >
          Выбрать дату
        </a>
        <SmartLink
          className="magnetic"
          href={drawerLinks[5].href}
          onNavigate={onClose}
          prefersReducedMotion={prefersReducedMotion}
          trackEvent={trackEvent}
        >
          {drawerLinks[5].label}
        </SmartLink>
      </aside>
    </>
  );
}
