import { useEffect, useLayoutEffect, useRef, useState } from "react";

// Albert Park layout traced from the supplied reference image.
// Keep this as the single source of truth for both drawing and car movement.
export const ALBERT_PARK_PATH = `
  M 209 235
  C 207 225, 205 214, 202 203
  L 198 190
  C 195 180, 188 174, 179 168
  L 165 158
  C 159 154, 153 157, 147 155
  C 133 150, 121 139, 115 128
  C 109 117, 109 105, 112 92
  L 116 76
  C 118 68, 125 64, 127 57
  C 130 48, 127 35, 124 27
  C 121 19, 115 14, 107 12
  C 99 9, 91 12, 82 5
  C 78 2, 75 2, 71 5
  C 64 10, 54 13, 45 17
  C 38 20, 32 24, 29 29
  L 30 61
  C 23 62, 14 63, 10 66
  C 15 80, 25 95, 36 106
  L 55 124
  C 62 131, 63 138, 58 149
  C 57 153, 60 157, 64 161
  L 130 226
  C 136 232, 141 233, 146 229
  L 154 219
  C 157 215, 159 215, 162 220
  L 174 242
  C 177 247, 180 248, 186 246
  L 209 238
  Z
`;

const clampLoop = (value) => ((value % 1) + 1) % 1;

export default function AlbertParkTrack({
  // Pass 0..1 from your own game loop. Leave null to use autoPlay.
  progress = null,
  autoPlay = true,
  lapsPerMinute = 6,
  carImage = null,
  // Use 0 if the supplied car image points right; 90 if it points upward.
  carRotationOffset = 90,
  trackColor = "#d7d4cb",
  roadColor = "#171717",
  background = "#090a08",
  className = "",
}) {
  const pathRef = useRef(null);
  const [automaticProgress, setAutomaticProgress] = useState(0);
  const [carPose, setCarPose] = useState({ x: 209, y: 235, angle: 0 });

  useEffect(() => {
    if (!autoPlay || progress !== null) return undefined;

    let frameId;
    let previousTime = performance.now();

    const animate = (currentTime) => {
      const deltaSeconds = (currentTime - previousTime) / 1000;
      previousTime = currentTime;

      setAutomaticProgress((current) =>
        clampLoop(current + deltaSeconds * (lapsPerMinute / 60)),
      );

      frameId = requestAnimationFrame(animate);
    };

    frameId = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frameId);
  }, [autoPlay, lapsPerMinute, progress]);

  const currentProgress = clampLoop(progress ?? automaticProgress);

  useLayoutEffect(() => {
    const path = pathRef.current;
    if (!path) return;

    const totalLength = path.getTotalLength();
    const distance = currentProgress * totalLength;
    const lookAhead = Math.min(distance + 1.5, totalLength);

    const point = path.getPointAtLength(distance);
    const nextPoint = path.getPointAtLength(lookAhead);
    const angle =
      (Math.atan2(nextPoint.y - point.y, nextPoint.x - point.x) * 180) /
      Math.PI;

    setCarPose({ x: point.x, y: point.y, angle });
  }, [currentProgress]);

  return (
    <div
      className={className}
      style={{
        width: "100%",
        maxWidth: 520,
        aspectRatio: "225 / 255",
      }}
    >
      <svg
        viewBox="-6 -6 237 267"
        preserveAspectRatio="xMidYMid meet"
        role="img"
        aria-label="Albert Park Circuit mini game track"
        style={{ display: "block", width: "100%", height: "100%" }}
      >
        <defs>
          <filter id="albert-park-glow" x="-30%" y="-30%" width="160%" height="160%">
            <feGaussianBlur stdDeviation="4" result="blur" />
            <feFlood floodColor="#d6bc45" floodOpacity="0.18" />
            <feComposite in2="blur" operator="in" />
            <feMerge>
              <feMergeNode />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        <rect x="-6" y="-6" width="237" height="267" fill={background} />

        {/* Soft outer highlight, matching the supplied reference image. */}
        <path
          d={ALBERT_PARK_PATH}
          fill="none"
          stroke={trackColor}
          strokeWidth="14"
          strokeLinecap="round"
          strokeLinejoin="round"
          opacity="0.28"
          filter="url(#albert-park-glow)"
        />

        {/* Track border. */}
        <path
          d={ALBERT_PARK_PATH}
          fill="none"
          stroke={trackColor}
          strokeWidth="11"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Driveable surface. */}
        <path
          ref={pathRef}
          d={ALBERT_PARK_PATH}
          fill="none"
          stroke={roadColor}
          strokeWidth="7"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        <g
          transform={`translate(${carPose.x} ${carPose.y}) rotate(${carPose.angle + carRotationOffset})`}
          style={{ pointerEvents: "none" }}
        >
          {carImage ? (
            <image
              href={carImage}
              x="-5"
              y="-9"
              width="10"
              height="18"
              preserveAspectRatio="xMidYMid meet"
            />
          ) : (
            <>
              <rect x="-3.5" y="-7" width="7" height="14" rx="2" fill="#ffd400" />
              <rect x="-5.5" y="-5" width="11" height="2.5" rx="1" fill="#ffd400" />
              <rect x="-5" y="4" width="10" height="2.5" rx="1" fill="#ffd400" />
              <rect x="-2" y="-3" width="4" height="5" rx="1" fill="#111" />
            </>
          )}
        </g>
      </svg>
    </div>
  );
}
