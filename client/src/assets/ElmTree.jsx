export default function ElmTree({ className = '' }) {
  return (
    <svg
      viewBox="0 0 320 420"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-label="Elm tree illustration"
    >
      {/* Ground shadow */}
      <ellipse cx="160" cy="408" rx="72" ry="10" fill="rgba(0,0,0,0.13)" />

      {/* Root flares */}
      <path d="M148 400 Q140 390 125 388 Q138 382 145 375" fill="#5c3310" />
      <path d="M172 400 Q180 390 195 388 Q182 382 175 375" fill="#5c3310" />

      {/* Trunk */}
      <path
        d="M148 400 Q144 370 146 340 Q148 310 150 280 Q152 250 153 220 Q154 195 156 175"
        stroke="#6b3f1a" strokeWidth="20" fill="none" strokeLinecap="round"
      />
      <path
        d="M172 400 Q168 370 166 340 Q164 310 162 280 Q160 250 159 220 Q158 195 157 175"
        stroke="#7a4820" strokeWidth="16" fill="none" strokeLinecap="round"
      />
      {/* Trunk highlight */}
      <path
        d="M155 400 Q153 360 154 320 Q155 280 156 240 Q157 205 158 180"
        stroke="#8b5a2b" strokeWidth="5" fill="none" strokeLinecap="round" opacity="0.5"
      />

      {/* Major branches */}
      {/* Left low */}
      <path d="M152 310 Q120 295 78 288" stroke="#6b3f1a" strokeWidth="11" fill="none" strokeLinecap="round"/>
      {/* Right low */}
      <path d="M158 305 Q192 288 232 282" stroke="#6b3f1a" strokeWidth="11" fill="none" strokeLinecap="round"/>
      {/* Left mid */}
      <path d="M154 260 Q118 238 72 218" stroke="#6b3f1a" strokeWidth="9" fill="none" strokeLinecap="round"/>
      {/* Right mid */}
      <path d="M158 252 Q196 232 238 216" stroke="#6b3f1a" strokeWidth="9" fill="none" strokeLinecap="round"/>
      {/* Left upper */}
      <path d="M155 215 Q128 192 95 168" stroke="#7a4820" strokeWidth="7" fill="none" strokeLinecap="round"/>
      {/* Right upper */}
      <path d="M158 208 Q186 184 218 162" stroke="#7a4820" strokeWidth="7" fill="none" strokeLinecap="round"/>
      {/* Centre top */}
      <path d="M157 185 Q158 155 160 125" stroke="#7a4820" strokeWidth="7" fill="none" strokeLinecap="round"/>
      {/* Far left droop */}
      <path d="M78 288 Q55 282 38 300" stroke="#7a4820" strokeWidth="6" fill="none" strokeLinecap="round"/>
      {/* Far right droop */}
      <path d="M232 282 Q256 276 272 295" stroke="#7a4820" strokeWidth="6" fill="none" strokeLinecap="round"/>

      {/* ── Leaf mass — back/shadow layer ── */}
      <ellipse cx="160" cy="108" rx="88" ry="62" fill="#1e5c1e" />
      <ellipse cx="82"  cy="175" rx="62" ry="46" fill="#1e5c1e" />
      <ellipse cx="240" cy="170" rx="64" ry="46" fill="#1e5c1e" />
      <ellipse cx="58"  cy="270" rx="52" ry="38" fill="#1e5c1e" />
      <ellipse cx="262" cy="265" rx="54" ry="38" fill="#1e5c1e" />
      <ellipse cx="42"  cy="288" rx="34" ry="26" fill="#1e5c1e" />
      <ellipse cx="278" cy="284" rx="34" ry="26" fill="#1e5c1e" />

      {/* ── Leaf mass — mid layer ── */}
      <ellipse cx="160" cy="92"  rx="105" ry="74" fill="#2d7a2d" />
      <ellipse cx="105" cy="148" rx="72"  ry="52" fill="#2d7a2d" />
      <ellipse cx="218" cy="145" rx="72"  ry="52" fill="#2d7a2d" />
      <ellipse cx="72"  cy="255" rx="60"  ry="44" fill="#2d7a2d" />
      <ellipse cx="250" cy="250" rx="62"  ry="44" fill="#2d7a2d" />
      <ellipse cx="50"  cy="282" rx="40"  ry="30" fill="#2d7a2d" />
      <ellipse cx="272" cy="278" rx="40"  ry="30" fill="#2d7a2d" />

      {/* ── Leaf mass — front/light layer ── */}
      <ellipse cx="160" cy="78"  rx="96"  ry="68" fill="#3a8f3a" />
      <ellipse cx="118" cy="130" rx="68"  ry="50" fill="#3a8f3a" />
      <ellipse cx="202" cy="128" rx="68"  ry="50" fill="#3a8f3a" />
      <ellipse cx="86"  cy="240" rx="58"  ry="42" fill="#3a8f3a" />
      <ellipse cx="236" cy="236" rx="60"  ry="42" fill="#3a8f3a" />
      <ellipse cx="62"  cy="272" rx="42"  ry="30" fill="#3a8f3a" />
      <ellipse cx="260" cy="268" rx="42"  ry="30" fill="#3a8f3a" />

      {/* ── Highlights ── */}
      <ellipse cx="138" cy="62"  rx="58"  ry="40" fill="#52b052" opacity="0.75" />
      <ellipse cx="188" cy="58"  rx="50"  ry="36" fill="#52b052" opacity="0.70" />
      <ellipse cx="100" cy="115" rx="45"  ry="32" fill="#52b052" opacity="0.65" />
      <ellipse cx="218" cy="112" rx="45"  ry="32" fill="#52b052" opacity="0.65" />
      <ellipse cx="76"  cy="228" rx="38"  ry="28" fill="#52b052" opacity="0.60" />
      <ellipse cx="244" cy="224" rx="38"  ry="28" fill="#52b052" opacity="0.60" />

      {/* Tiny leaf detail dots */}
      <circle cx="130" cy="52" r="6" fill="#6dc96d" opacity="0.6" />
      <circle cx="195" cy="48" r="5" fill="#6dc96d" opacity="0.6" />
      <circle cx="100" cy="108" r="5" fill="#6dc96d" opacity="0.5" />
      <circle cx="222" cy="105" r="5" fill="#6dc96d" opacity="0.5" />
      <circle cx="68"  cy="220" r="5" fill="#6dc96d" opacity="0.5" />
      <circle cx="250" cy="217" r="5" fill="#6dc96d" opacity="0.5" />
    </svg>
  );
}
