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

        {/* iPhone silhouette + arrow — enlarged to fill more of the tile */}
        <div style={{ position: "relative", zIndex: 1 }}>
          <svg width="158" height="188" viewBox="0 0 110 160" fill="none">
            {/* iPhone outer body */}
            <rect x="8" y="2" width="94" height="156" rx="18" ry="18"
              fill="none" stroke="white" strokeWidth="7"/>
            {/* Speaker slot */}
            <rect x="36" y="10" width="38" height="5" rx="2.5" fill="white" opacity="0.9"/>
            {/* Front camera dot */}
            <circle cx="28" cy="12" r="3" fill="white" opacity="0.9"/>
            {/* Screen area */}
            <rect x="14" y="24" width="82" height="110" rx="4"
              fill="rgba(30,100,220,0.6)"/>
            {/* Home button */}
            <circle cx="55" cy="148" r="9" fill="none" stroke="white" strokeWidth="5"/>

            {/* Upload arrow — head + longer stem filling more of screen */}
            <polygon
              points="55,32 76,60 63,60 63,112 47,112 47,60 34,60"
              fill="white" opacity="0.95"/>
            {/* Chevron notch at tail bottom */}
            <polygon points="47,112 55,122 63,112"
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
