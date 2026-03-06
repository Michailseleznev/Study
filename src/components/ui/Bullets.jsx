export default function Bullets({ items, style }) {
  return (
    <div className="bul" style={style}>
      {items.map((item) => (
        <div key={item}>{item}</div>
      ))}
    </div>
  );
}
