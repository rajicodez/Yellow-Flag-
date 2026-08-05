export default function BackgroundEffects() {
  return (
    <>
      <div className="bg-carbon" aria-hidden="true" />
      <div className="bg-grid" aria-hidden="true" />
      <div className="bg-track-lines" aria-hidden="true">
        <svg className="bg-track-svg" viewBox="0 0 1440 900" preserveAspectRatio="none">
          <path d="M-100,700 Q360,400 720,550 T1580,350" fill="none" stroke="rgba(225,6,0,0.08)" strokeWidth="2" />
          <path d="M-100,750 Q400,500 800,620 T1580,450" fill="none" stroke="rgba(225,6,0,0.05)" strokeWidth="1" />
          <path d="M200,900 Q600,600 1000,750 T1440,500" fill="none" stroke="rgba(255,255,255,0.03)" strokeWidth="1" strokeDasharray="8 12" />
        </svg>
      </div>
      <div className="speed-lines" aria-hidden="true">
        {Array.from({ length: 12 }, (_, i) => (
          <span key={i} />
        ))}
      </div>
      <div className="bg-checkered-corner bg-checkered-left" aria-hidden="true" />
      <div className="bg-checkered-corner bg-checkered-right" aria-hidden="true" />
    </>
  );
}
