export default function TabGlow() {
  return (
    <svg className="tab-glow" id="tabGlow" viewBox="0 0 1200 800" aria-hidden="true">
      <defs>
        <linearGradient id="glowA" x1="0" y1="0" x2="1" y2="1">
          <stop className="glow-stop-a" offset="0%" />
          <stop className="glow-stop-b" offset="100%" />
        </linearGradient>
        <linearGradient id="glowB" x1="1" y1="0" x2="0" y2="1">
          <stop className="glow-stop-b" offset="0%" />
          <stop className="glow-stop-c" offset="100%" />
        </linearGradient>
        <linearGradient id="glowC" x1="0" y1="1" x2="1" y2="0">
          <stop className="glow-stop-c" offset="0%" />
          <stop className="glow-stop-a" offset="100%" />
        </linearGradient>
      </defs>
      <path className="glow-path a" d="M0,220 C200,60 420,60 560,220 S900,500 1200,380" stroke="url(#glowA)" strokeWidth="170" fill="none" />
      <path className="glow-path b" d="M0,620 C180,520 380,540 520,680 S900,760 1200,620" stroke="url(#glowB)" strokeWidth="140" fill="none" />
      <path className="glow-path c" d="M0,420 C200,300 420,320 600,420 S920,560 1200,520" stroke="url(#glowC)" strokeWidth="120" fill="none" />
      <path className="glow-path d" d="M0,320 C160,200 360,220 520,320 S860,520 1200,460" stroke="url(#glowB)" strokeWidth="110" fill="none" />
      <path className="glow-path e" d="M0,520 C180,420 360,440 520,560 S880,700 1200,640" stroke="url(#glowA)" strokeWidth="100" fill="none" />
    </svg>
  );
}
