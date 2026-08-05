export default function RaceLights() {
  return (
    <div className="race-lights" aria-hidden="true">
      <div className="race-lights-bar">
        {[1, 2, 3, 4, 5].map((n) => (
          <span key={n} className="race-light" style={{ animationDelay: `${n * 0.4}s` }} />
        ))}
      </div>
      <span className="race-lights-label">LIGHTS OUT</span>
    </div>
  );
}
