export function Checklist() {
  return (
    <div style={{
      width: "100%", height: "100vh",
      display: "flex", alignItems: "center", justifyContent: "center",
      background: "#0a0a0a",
    }}>
      <div style={{
        width: 300, height: 300,
        borderRadius: 64,
        background: "linear-gradient(145deg, #0a1a0a 0%, #0d1f0d 50%, #0a180a 100%)",
        boxShadow: "0 0 60px rgba(34,197,94,0.2), inset 0 1px 0 rgba(255,255,255,0.06)",
        display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center", gap: 0,
        position: "relative", overflow: "hidden",
      }}>
        {/* Glow */}
        <div style={{
          position: "absolute", width: 200, height: 200,
          borderRadius: "50%",
          background: "radial-gradient(circle, rgba(34,197,94,0.1) 0%, transparent 70%)",
          top: "50%", left: "50%", transform: "translate(-50%, -50%)",
        }} />
        {/* Checklist card */}
        <div style={{
          background: "rgba(255,255,255,0.05)",
          borderRadius: 16, padding: "20px 24px",
          border: "1px solid rgba(255,255,255,0.08)",
          display: "flex", flexDirection: "column", gap: 12,
          backdropFilter: "blur(10px)",
          zIndex: 1, width: 180,
        }}>
          {[
            { done: true, label: "Metadata" },
            { done: true, label: "Privacy" },
            { done: true, label: "Age Rating" },
            { done: false, label: "Binary" },
          ].map((item, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{
                width: 20, height: 20, borderRadius: 6, flexShrink: 0,
                background: item.done ? "#22c55e" : "transparent",
                border: item.done ? "none" : "2px solid rgba(255,255,255,0.2)",
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>
                {item.done && (
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                    <path d="M2 6L5 9L10 3" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                )}
              </div>
              <div style={{
                height: 8, borderRadius: 4,
                width: item.done ? "100%" : "60%",
                background: item.done
                  ? "linear-gradient(90deg, rgba(34,197,94,0.6), rgba(34,197,94,0.2))"
                  : "rgba(255,255,255,0.15)",
              }} />
            </div>
          ))}
        </div>
        <div style={{
          fontFamily: "monospace", fontSize: 11, fontWeight: 700,
          color: "rgba(134,239,172,0.6)", letterSpacing: 5,
          textTransform: "uppercase", marginTop: 16, zIndex: 1,
        }}>POSTAPP</div>
      </div>
    </div>
  );
}
