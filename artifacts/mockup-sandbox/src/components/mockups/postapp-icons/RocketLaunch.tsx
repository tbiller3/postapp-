export function RocketLaunch() {
  return (
    <div style={{
      width: "100%", height: "100vh",
      display: "flex", alignItems: "center", justifyContent: "center",
      background: "#0a0a0a",
    }}>
      <div style={{
        width: 300, height: 300,
        borderRadius: 64,
        background: "linear-gradient(160deg, #0f0a1e 0%, #1a0a3e 40%, #0a1230 100%)",
        boxShadow: "0 0 60px rgba(99, 60, 220, 0.3), inset 0 1px 0 rgba(255,255,255,0.08)",
        display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center",
        position: "relative", overflow: "hidden",
      }}>
        {/* Stars */}
        {[{x:40,y:60,s:2},{x:80,y:30,s:1.5},{x:200,y:50,s:2},{x:240,y:80,s:1.5},
          {x:30,y:180,s:1.5},{x:260,y:160,s:2},{x:120,y:240,s:1.5},{x:180,y:230,s:1}].map((star, i) => (
          <div key={i} style={{
            position: "absolute", left: star.x, top: star.y,
            width: star.s, height: star.s,
            borderRadius: "50%", background: "rgba(255,255,255,0.7)",
          }} />
        ))}
        {/* Exhaust glow */}
        <div style={{
          position: "absolute", bottom: 40, left: "50%",
          transform: "translateX(-50%)",
          width: 40, height: 80,
          background: "radial-gradient(ellipse, rgba(251,146,60,0.6) 0%, rgba(239,68,68,0.3) 40%, transparent 70%)",
        }} />
        {/* Rocket */}
        <svg width="90" height="110" viewBox="0 0 90 110" fill="none" style={{zIndex:1, marginBottom: 8}}>
          {/* Body */}
          <path d="M45 8 C60 8 72 28 72 55 L72 72 L18 72 L18 55 C18 28 30 8 45 8Z" fill="url(#rocketBody)" />
          {/* Nose */}
          <path d="M45 8 C52 8 58 18 60 28 L45 20 L30 28 C32 18 38 8 45 8Z" fill="#c4b5fd"/>
          {/* Window */}
          <circle cx="45" cy="45" r="10" fill="#1e1b4b" stroke="#8b5cf6" strokeWidth="2"/>
          <circle cx="45" cy="45" r="6" fill="url(#window)"/>
          {/* Fins */}
          <path d="M18 72 L5 88 L18 82Z" fill="#7c3aed"/>
          <path d="M72 72 L85 88 L72 82Z" fill="#7c3aed"/>
          {/* Exhaust flames */}
          <path d="M30 72 Q35 90 45 95 Q55 90 60 72Z" fill="url(#flame)"/>
          <defs>
            <linearGradient id="rocketBody" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#a78bfa"/>
              <stop offset="100%" stopColor="#7c3aed"/>
            </linearGradient>
            <radialGradient id="window" cx="40%" cy="35%">
              <stop offset="0%" stopColor="#60a5fa" stopOpacity="0.8"/>
              <stop offset="100%" stopColor="#1e40af" stopOpacity="0.4"/>
            </radialGradient>
            <linearGradient id="flame" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#fbbf24"/>
              <stop offset="50%" stopColor="#f97316"/>
              <stop offset="100%" stopColor="#ef4444" stopOpacity="0"/>
            </linearGradient>
          </defs>
        </svg>
        <div style={{
          fontFamily: "monospace", fontSize: 11, fontWeight: 700,
          color: "rgba(196,181,253,0.7)", letterSpacing: 5,
          textTransform: "uppercase", zIndex: 1,
        }}>POSTAPP</div>
      </div>
    </div>
  );
}
