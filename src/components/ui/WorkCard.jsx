export default function WorkCard({ card }) {
  return (
    <article
      className="work"
      data-origin={card.origin || "local"}
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
