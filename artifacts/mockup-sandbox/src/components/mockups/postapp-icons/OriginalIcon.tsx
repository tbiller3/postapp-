export function OriginalIcon() {
  return (
    <div style={{
      width: "100%", height: "100vh",
      display: "flex", alignItems: "center", justifyContent: "center",
      background: "#0a0a0a",
    }}>
      <div style={{
        width: 300, height: 300,
        borderRadius: 64,
        background: "radial-gradient(ellipse at 50% 40%, #3b9eff 0%, #1a6fd4 35%, #0d4fa8 65%, #083a80 100%)",
        boxShadow: "0 0 60px rgba(59,158,255,0.4), inset 0 1px 0 rgba(255,255,255,0.15)",
        display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center",
        gap: 4,
        position: "relative", overflow: "hidden",
      }}>
        {/* Light halo at bottom */}
        <div style={{
          position: "absolute", bottom: -20, left: "50%", transform: "translateX(-50%)",
          width: 200, height: 80,
          background: "radial-gradient(ellipse, rgba(255,255,255,0.18) 0%, transparent 70%)",
        }} />

        {/* iPhone silhouette — widened to align with POSTAPP text below */}
        <div style={{ position: "relative", zIndex: 1 }}>
          {/* viewBox 0 0 130 160: iPhone center at x=65 */}
          <svg width="182" height="188" viewBox="0 0 130 160" fill="none">
            {/* iPhone outer body */}
            <rect x="5" y="2" width="120" height="156" rx="20" ry="20"
              fill="none" stroke="white" strokeWidth="7"/>
            {/* Speaker slot — centered at x=65 */}
            <rect x="44" y="10" width="42" height="5" rx="2.5" fill="white" opacity="0.9"/>
            {/* Front camera dot */}
            <circle cx="29" cy="12" r="3" fill="white" opacity="0.9"/>
            {/* Screen area */}
            <rect x="13" y="24" width="104" height="110" rx="4"
              fill="rgba(30,100,220,0.6)"/>
            {/* Home button */}
            <circle cx="65" cy="148" r="9" fill="none" stroke="white" strokeWidth="5"/>

            {/*
              Arrow centered at x=65
              Head: wider triangle — tip at (65,30), wings at x=38 and x=92
              Stem: 22px wide — x=54 to x=76
              Stem bottom at y=112, notch to y=124
            */}
            <polygon
              points="65,30 92,62 76,62 76,112 54,112 54,62 38,62"
              fill="white" opacity="0.95"/>
            {/* Chevron notch at tail bottom */}
            <polygon points="54,112 65,124 76,112"
              fill="rgba(30,100,220,0.6)"/>
          </svg>
        </div>

        {/* POSTAPP text */}
        <div style={{
          fontFamily: "'Arial Black', 'Helvetica Neue', Arial, sans-serif",
          fontSize: 26, fontWeight: 900,
          color: "white",
          letterSpacing: 1,
          textShadow: "0 2px 12px rgba(0,0,0,0.3)",
          zIndex: 1,
        }}>
          POSTAPP
        </div>
      </div>
    </div>
  );
}
