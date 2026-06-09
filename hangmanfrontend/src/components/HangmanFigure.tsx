interface Props {
  wrongCount: number;
  maxWrong: number;
  state?: "playing" | "win" | "lose";
}

/**
 * Claymation hangman with expressive face.
 * Mood progresses: happy → nervous → sweating → scared → dead
 */
export const HangmanFigure = ({ wrongCount, maxWrong, state = "playing" }: Props) => {
  const ratio = Math.min(1, wrongCount / maxWrong);
  const stage = Math.min(8, Math.round(ratio * 8));
  const showPart = (i: number) => i <= stage;

  // Mood: 0 happy, 1 nervous, 2 worried, 3 scared, 4 dead
  let mood: 0 | 1 | 2 | 3 | 4 = 0;
  if (state === "win") mood = 0;
  else if (state === "lose") mood = 4;
  else if (ratio < 0.25) mood = 0;
  else if (ratio < 0.5) mood = 1;
  else if (ratio < 0.75) mood = 2;
  else mood = 3;

  // Color of body — gets paler as in trouble
  const skin = state === "lose" ? "#9aa3b2" : "#f7d4b1";
  const skinShade = state === "lose" ? "#6e7585" : "#e3a978";
  const swing = state === "lose" ? "rotate(8deg)" : state === "win" ? "rotate(-3deg)" : "rotate(0deg)";
  const danceClass = state === "win" ? "animate-wobble" : "";

  return (
    <svg viewBox="0 0 260 300" className="w-full h-full overflow-visible">
      <defs>
        <radialGradient id="head-grad" cx="40%" cy="35%" r="65%">
          <stop offset="0%" stopColor="#ffe9d2" />
          <stop offset="100%" stopColor={skin} />
        </radialGradient>
        <radialGradient id="body-grad" cx="40%" cy="30%" r="70%">
          <stop offset="0%" stopColor="#ffd8b2" />
          <stop offset="100%" stopColor={skinShade} />
        </radialGradient>
        <linearGradient id="rope" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="#c9a370" />
          <stop offset="100%" stopColor="#8a6a3e" />
        </linearGradient>
        <linearGradient id="wood" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="#c98a52" />
          <stop offset="100%" stopColor="#7a4a22" />
        </linearGradient>
        <filter id="soft" x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur stdDeviation="1.2" />
        </filter>
        <filter id="drop" x="-30%" y="-30%" width="160%" height="160%">
          <feDropShadow dx="0" dy="4" stdDeviation="3" floodOpacity="0.25" />
        </filter>
      </defs>

      {/* Ground shadow */}
      <ellipse cx="130" cy="282" rx="90" ry="8" fill="#000" opacity="0.15" />

      {/* Gallows — chunky clay wood */}
      <g filter="url(#drop)">
        {/* base */}
        <rect x="20" y="262" width="200" height="22" rx="11" fill="url(#wood)" />
        <rect x="28" y="266" width="184" height="6" rx="3" fill="#fff" opacity="0.25" />
        {/* post */}
        <rect x="50" y="30" width="22" height="240" rx="11" fill="url(#wood)" />
        <rect x="54" y="34" width="6" height="232" rx="3" fill="#fff" opacity="0.3" />
        {/* top beam */}
        <rect x="50" y="20" width="130" height="22" rx="11" fill="url(#wood)" />
        <rect x="56" y="24" width="120" height="5" rx="2.5" fill="#fff" opacity="0.3" />
        {/* support */}
        <polygon points="72,42 100,42 72,70" fill="url(#wood)" />
      </g>

      {/* Rope */}
      {showPart(0) && (
        <line x1="155" y1="42" x2="155" y2="78" stroke="url(#rope)" strokeWidth="5" strokeLinecap="round" />
      )}

      {/* Character — wraps for swing/dance */}
      <g className={danceClass} style={{ transformOrigin: "155px 50px", transform: swing, transition: "transform 0.4s" }}>
        {/* head */}
        {showPart(1) && (
          <g filter="url(#drop)">
            <circle cx="155" cy="105" r="28" fill="url(#head-grad)" stroke={skinShade} strokeWidth="2" />
            {/* highlight */}
            <ellipse cx="146" cy="96" rx="9" ry="6" fill="#fff" opacity="0.5" />
            {/* cheeks */}
            {mood < 4 && (
              <>
                <circle cx="142" cy="116" r="4" fill="#ff8a9a" opacity="0.65" />
                <circle cx="168" cy="116" r="4" fill="#ff8a9a" opacity="0.65" />
              </>
            )}
            {/* eyes */}
            {mood === 4 ? (
              <>
                <path d="M142 100 l8 8 M150 100 l-8 8" stroke="#2a1f3a" strokeWidth="3" strokeLinecap="round" />
                <path d="M160 100 l8 8 M168 100 l-8 8" stroke="#2a1f3a" strokeWidth="3" strokeLinecap="round" />
              </>
            ) : mood === 3 ? (
              <>
                <circle cx="146" cy="103" r="5" fill="#fff" />
                <circle cx="146" cy="104" r="2.5" fill="#2a1f3a" />
                <circle cx="164" cy="103" r="5" fill="#fff" />
                <circle cx="164" cy="104" r="2.5" fill="#2a1f3a" />
              </>
            ) : (
              <>
                <ellipse cx="146" cy="103" rx="3" ry={mood === 2 ? 2 : 3.5} fill="#2a1f3a" />
                <ellipse cx="164" cy="103" rx="3" ry={mood === 2 ? 2 : 3.5} fill="#2a1f3a" />
                {mood < 2 && <circle cx="147" cy="102" r="1" fill="#fff" />}
                {mood < 2 && <circle cx="165" cy="102" r="1" fill="#fff" />}
              </>
            )}
            {/* mouth */}
            {state === "win" ? (
              <path d="M142 120 Q155 132 168 120" stroke="#2a1f3a" strokeWidth="2.5" fill="#c44" strokeLinecap="round" />
            ) : mood === 4 ? (
              <ellipse cx="155" cy="122" rx="6" ry="4" fill="#2a1f3a" />
            ) : mood === 3 ? (
              <ellipse cx="155" cy="122" rx="4" ry="5" fill="#2a1f3a" />
            ) : mood === 2 ? (
              <path d="M148 122 Q155 118 162 122" stroke="#2a1f3a" strokeWidth="2.5" fill="none" strokeLinecap="round" />
            ) : mood === 1 ? (
              <path d="M148 121 L162 121" stroke="#2a1f3a" strokeWidth="2.5" strokeLinecap="round" />
            ) : (
              <path d="M146 119 Q155 126 164 119" stroke="#2a1f3a" strokeWidth="2.5" fill="none" strokeLinecap="round" />
            )}

            {/* sweat drops when worried */}
            {mood === 2 && (
              <path d="M180 102 q4 6 0 10 q-4 -4 0 -10z" fill="#7ec8ff" opacity="0.9" />
            )}
            {mood === 3 && (
              <>
                <path d="M180 100 q4 6 0 10 q-4 -4 0 -10z" fill="#7ec8ff" opacity="0.9" />
                <path d="M128 108 q-4 6 0 10 q4 -4 0 -10z" fill="#7ec8ff" opacity="0.9" />
              </>
            )}
          </g>
        )}

        {/* body */}
        {showPart(2) && (
          <g filter="url(#drop)">
            <rect x="138" y="132" width="34" height="60" rx="14" fill="url(#body-grad)" stroke={skinShade} strokeWidth="2" />
            {/* button */}
            <circle cx="155" cy="150" r="3" fill="#fff" opacity="0.8" />
            <circle cx="155" cy="165" r="3" fill="#fff" opacity="0.8" />
            <circle cx="155" cy="180" r="3" fill="#fff" opacity="0.8" />
          </g>
        )}

        {/* arms */}
        {showPart(3) && (
          <g filter="url(#drop)">
            <rect x="108" y="138" width="34" height="12" rx="6" fill="url(#body-grad)"
              transform="rotate(25 125 144)" stroke={skinShade} strokeWidth="2" />
          </g>
        )}
        {showPart(4) && (
          <g filter="url(#drop)">
            <rect x="170" y="138" width="34" height="12" rx="6" fill="url(#body-grad)"
              transform="rotate(-25 185 144)" stroke={skinShade} strokeWidth="2" />
          </g>
        )}

        {/* legs */}
        {showPart(5) && (
          <g filter="url(#drop)">
            <rect x="135" y="190" width="13" height="40" rx="6" fill="url(#body-grad)"
              transform="rotate(8 141 210)" stroke={skinShade} strokeWidth="2" />
          </g>
        )}
        {showPart(6) && (
          <g filter="url(#drop)">
            <rect x="162" y="190" width="13" height="40" rx="6" fill="url(#body-grad)"
              transform="rotate(-8 168 210)" stroke={skinShade} strokeWidth="2" />
          </g>
        )}

        {/* feet/shoes once both legs */}
        {showPart(6) && (
          <g filter="url(#drop)">
            <ellipse cx="138" cy="232" rx="11" ry="6" fill="#5a3a2a" />
            <ellipse cx="172" cy="232" rx="11" ry="6" fill="#5a3a2a" />
          </g>
        )}

        {/* tongue out / X eyes only when fully dead handled in head */}
      </g>

      {/* Win sparkles */}
      {state === "win" && (
        <g>
          <text x="100" y="80" fontSize="22" className="animate-pop">✨</text>
          <text x="200" y="90" fontSize="22" className="animate-pop">⭐</text>
          <text x="80" y="160" fontSize="20" className="animate-pop">💫</text>
        </g>
      )}
    </svg>
  );
};
