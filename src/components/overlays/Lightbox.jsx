import SmartLink from "../ui/SmartLink";

export default function Lightbox({ lightbox, lightboxRef, onClose, prefersReducedMotion, trackEvent }) {
  return (
    <div
      className={`lightbox${lightbox.open ? " open" : ""}`}
      id="lightbox"
      aria-hidden={!lightbox.open}
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div className="lb-panel" role="dialog" aria-modal="true" aria-label="Просмотр фотографии" ref={lightboxRef}>
        <div className="lb-top">
          <div className="lb-title" id="lbTitle">
            {lightbox.title}
          </div>
          <button className="lb-close" type="button" id="lbClose" aria-label="Закрыть" onClick={onClose}></button>
        </div>
        <img className="lb-img" id="lbImg" alt="Просмотр фото" src={lightbox.src || undefined} />
        <div className="lb-desc" id="lbDesc">{lightbox.desc}</div>
        <div className="lb-bottom">
          <div className="small">Понравилось? →</div>
          <SmartLink
            className="btn primary magnetic"
            href="#contact"
            id="lbCta"
            onNavigate={onClose}
            prefersReducedMotion={prefersReducedMotion}
            trackEvent={trackEvent}
            trackName="cta_click"
          >
            Записаться
          </SmartLink>
        </div>
      </div>
    </div>
  );
}
