export function AppGrid() {
  return (
    <div style={{
      width: "100%", height: "100vh",
      display: "flex", alignItems: "center", justifyContent: "center",
      background: "#0a0a0a",
    }}>
      <div style={{
        width: 300, height: 300,
        borderRadius: 64,
        background: "linear-gradient(145deg, #0d0d0d 0%, #1a1a2e 100%)",
        boxShadow: "0 0 60px rgba(139,92,246,0.2), inset 0 1px 0 rgba(255,255,255,0.06)",
        display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center", gap: 14,
        position: "relative", overflow: "hidden",
      }}>
        {/* Mini app icons grid */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, zIndex: 1 }}>
          {[
            { bg: "#7c3aed", label: "W", check: true },
            { bg: "#0f766e", label: "P", check: true },
            { bg: "#b45309", label: "F", check: false },
            { bg: "#1d4ed8", label: "T", check: false },
          ].map((app, i) => (
            <div key={i} style={{ position: "relative" }}>
              <div style={{
                width: 72, height: 72, borderRadius: 18,
                background: app.bg,
                display: "flex", alignItems: "center", justifyContent: "center",
                boxShadow: "0 4px 12px rgba(0,0,0,0.5)",
                border: "1px solid rgba(255,255,255,0.1)",
              }}>
                <span style={{
                  fontFamily: "system-ui", fontSize: 28, fontWeight: 700,
                  color: "rgba(255,255,255,0.9)",
                }}>{app.label}</span>
              </div>
              {app.check && (
                <div style={{
                  position: "absolute", top: -6, right: -6,
                  width: 22, height: 22, borderRadius: "50%",
                  background: "#22c55e",
                  border: "2px solid #0d0d0d",
                  display: "flex", alignItems: "center", justifyContent: "center",
                }}>
                  <svg width="11" height="11" viewBox="0 0 11 11" fill="none">
                    <path d="M2 5.5L4.5 8L9 3" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
              )}
              {!app.check && (
                <div style={{
                  position: "absolute", top: -6, right: -6,
                  width: 22, height: 22, borderRadius: "50%",
                  background: "#f59e0b",
                  border: "2px solid #0d0d0d",
                  display: "flex", alignItems: "center", justifyContent: "center",
                }}>
                  <span style={{ fontSize: 12, color: "white", fontWeight: 700 }}>!</span>
                </div>
              )}
            </div>
          ))}
        </div>
        <div style={{
          fontFamily: "monospace", fontSize: 11, fontWeight: 700,
          color: "rgba(167,139,250,0.6)", letterSpacing: 5,
          textTransform: "uppercase", zIndex: 1,
        }}>POSTAPP</div>
      </div>
    </div>
  );
}
