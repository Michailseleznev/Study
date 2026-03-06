import { buildLightboxSrc } from "../../lib/buildLightboxSrc";

export default function WorkCard({ card, onOpen }) {
  const handleOpen = () => {
    onOpen({
      category: card.category,
      desc: card.story || card.desc || "",
      src: card.full || buildLightboxSrc(card.src),
      title: card.title
    });
  };

  const handleKeyDown = (event) => {
    if (event.key !== "Enter" && event.key !== " ") return;
    event.preventDefault();
    handleOpen();
  };

  return (
    <article
      className="work"
      data-origin={card.origin || "local"}
      onClick={handleOpen}
      onKeyDown={handleKeyDown}
      role="button"
      tabIndex={0}
    >
      <span className="scan"></span>
      <img
        alt={card.alt || card.title}
        decoding="async"
        height={card.imgH || undefined}
        loading="lazy"
        src={card.thumb || card.src}
        width={card.imgW || undefined}
      />
      <div className={`label${card.origin === "unsplash" ? " label--unsplash" : ""}`}>
        <div className="info">
          <div className="title">{card.title}</div>
          {card.story ? <div className="story">{card.story}</div> : null}
        </div>
      </div>
    </article>
  );
}
