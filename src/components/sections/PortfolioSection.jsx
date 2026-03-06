import { portfolioPanels, portfolioTabs } from "../../data/siteContent";
import SectionHead from "../ui/SectionHead";
import SmartLink from "../ui/SmartLink";
import TabGlow from "../ui/TabGlow";
import WorkCard from "../ui/WorkCard";

export default function PortfolioSection({
  activeTab,
  onOpenLightbox,
  onTabChange,
  trackEvent,
  unsplashState
}) {
  return (
    <section id="portfolio" className="tight">
      <div className="container">
        <SectionHead title="Мои работы">
          Категории: студийные съёмки, портреты, креативные съемки, стоковые фотографии и природа. Показываю по 4 кадра из каждой папки + отдельную вкладку «Недавние фотографии» из Unsplash. Нажми на фото — откроется просмотр с описанием.
        </SectionHead>

        <div className="portfolio-tabs">
          {portfolioTabs.map((tab) => (
            <input
              key={tab.id}
              checked={activeTab === tab.id}
              className="tab-input"
              id={tab.id}
              name="workTabs"
              onChange={() => {
                onTabChange(tab.id);
              }}
              type="radio"
            />
          ))}

          <div className="tabs reveal" id="tabs" aria-label="Фильтр работ">
            {portfolioTabs.map((tab) => (
              <label
                key={tab.id}
                className="tab magnetic"
                htmlFor={tab.id}
                onClick={() => {
                  trackEvent("cta_click", { href: `#${tab.id}`, id: tab.id, text: tab.label });
                }}
              >
                {tab.label}
              </label>
            ))}
          </div>

          <div className="grid-panels" id="grid" aria-label="Галерея">
            <TabGlow />

            {portfolioPanels.map((panel) => (
              <div key={panel.className} className={`grid grid-panel ${panel.className}`} data-cat={panel.category}>
                {panel.cards.map((card) => (
                  <WorkCard
                    key={card.src}
                    card={{ ...card, category: panel.category }}
                    onOpen={onOpenLightbox}
                  />
                ))}
              </div>
            ))}

            <div className="grid grid-panel grid-panel--unsplash" data-cat="Недавние фотографии" id="unsplashGrid">
              <div className="unsplash-credit">
                Фото:{" "}
                <SmartLink
                  external
                  href="https://unsplash.com/@mihmihfoto?utm_source=mellow_photos&utm_medium=referral"
                  trackEvent={trackEvent}
                  trackName="cta_click"
                >
                  @mihmihfoto
                </SmartLink>{" "}
                ·{" "}
                <SmartLink
                  external
                  href="https://unsplash.com?utm_source=mellow_photos&utm_medium=referral"
                  trackEvent={trackEvent}
                  trackName="cta_click"
                >
                  Unsplash
                </SmartLink>
              </div>

              {unsplashState.status === "ready" && unsplashState.items.length ? (
                unsplashState.items.map((item) => (
                  <WorkCard key={item.id} card={item} onOpen={onOpenLightbox} />
                ))
              ) : (
                <div className="empty">{unsplashState.message}</div>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
