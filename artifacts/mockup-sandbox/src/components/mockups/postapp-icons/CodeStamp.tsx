export function CodeStamp() {
  return (
    <div style={{
      width: "100%", height: "100vh",
      display: "flex", alignItems: "center", justifyContent: "center",
      background: "#0a0a0a",
    }}>
      <div style={{
        width: 300, height: 300,
        borderRadius: 64,
        background: "linear-gradient(145deg, #001a00 0%, #002200 50%, #001500 100%)",
        boxShadow: "0 0 60px rgba(74, 222, 128, 0.15), inset 0 1px 0 rgba(255,255,255,0.05)",
        display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center", gap: 6,
        position: "relative", overflow: "hidden",
        fontFamily: "'SF Mono', 'Fira Code', monospace",
      }}>
        {/* Scan lines */}
        <div style={{
          position: "absolute", inset: 0,
          backgroundImage: "repeating-linear-gradient(0deg, transparent, transparent 3px, rgba(74,222,128,0.02) 3px, rgba(74,222,128,0.02) 4px)",
          borderRadius: 64,
        }} />
        {/* Terminal window bar */}
        <div style={{
          position: "absolute", top: 32, left: 32, right: 32,
          height: 24,
          background: "rgba(74,222,128,0.06)",
          borderRadius: "8px 8px 0 0",
          borderBottom: "1px solid rgba(74,222,128,0.15)",
          display: "flex", alignItems: "center", paddingLeft: 10, gap: 5,
        }}>
          {["#ff5f57","#febc2e","#28c840"].map((c, i) => (
            <div key={i} style={{ width: 8, height: 8, borderRadius: "50%", background: c, opacity: 0.7 }} />
          ))}
        </div>
        {/* Code text */}
        <div style={{ zIndex: 1, textAlign: "center", lineHeight: 1.6, marginTop: 16 }}>
          <div style={{ fontSize: 13, color: "rgba(74,222,128,0.35)" }}>{"// App Store"}</div>
          <div style={{ fontSize: 28, fontWeight: 700, color: "#4ade80", letterSpacing: -1 }}>
            {"<POST"}
            <span style={{ color: "#a78bfa" }}>/</span>
            {">"}
          </div>
          <div style={{
            fontSize: 11, color: "rgba(74,222,128,0.5)",
            marginTop: 4,
          }}>submit.complete()</div>
        </div>
        {/* Bottom badge */}
        <div style={{
          marginTop: 12,
          background: "rgba(74,222,128,0.08)",
          border: "1px solid rgba(74,222,128,0.2)",
          borderRadius: 20, padding: "3px 14px", zIndex: 1,
        }}>
          <span style={{
            fontSize: 10, fontWeight: 700, letterSpacing: 5,
            color: "rgba(74,222,128,0.6)", textTransform: "uppercase",
          }}>POSTAPP</span>
        </div>
      </div>
    </div>
  );
}
