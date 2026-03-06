export default function SectionHead({ title, children }) {
  return (
    <div className="section-head">
      <h2 className="reveal holo">{title}</h2>
      <p className="reveal">{children}</p>
    </div>
  );
}
