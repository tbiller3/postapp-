export function SubmitArrow() {
  return (
    <div style={{
      width: "100%", height: "100vh",
      display: "flex", alignItems: "center", justifyContent: "center",
      background: "#0a0a0a",
    }}>
      <div style={{
        width: 300, height: 300,
        borderRadius: 64,
        background: "linear-gradient(150deg, #1a0533 0%, #2d0a6b 40%, #1a0440 100%)",
        boxShadow: "0 0 80px rgba(168, 85, 247, 0.4), inset 0 1px 0 rgba(255,255,255,0.1)",
        display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center", gap: 12,
        position: "relative", overflow: "hidden",
      }}>
        {/* Background glow rings */}
        <div style={{
          position: "absolute", width: 220, height: 220, borderRadius: "50%",
          border: "1px solid rgba(168,85,247,0.15)",
          top: "50%", left: "50%", transform: "translate(-50%, -55%)",
        }} />
        <div style={{
          position: "absolute", width: 160, height: 160, borderRadius: "50%",
          border: "1px solid rgba(168,85,247,0.2)",
          top: "50%", left: "50%", transform: "translate(-50%, -55%)",
        }} />
        {/* Circle with arrow */}
        <div style={{
          width: 110, height: 110, borderRadius: "50%",
          background: "linear-gradient(135deg, #a855f7, #7c3aed)",
          boxShadow: "0 8px 32px rgba(168,85,247,0.6), 0 0 0 2px rgba(255,255,255,0.1)",
          display: "flex", alignItems: "center", justifyContent: "center",
          zIndex: 1,
        }}>
          <svg width="52" height="52" viewBox="0 0 52 52" fill="none">
            <path d="M26 40V12M26 12L14 24M26 12L38 24"
              stroke="white" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>
        {/* App Store label */}
        <div style={{
          background: "rgba(255,255,255,0.07)",
          borderRadius: 20, padding: "4px 14px",
          border: "1px solid rgba(255,255,255,0.1)",
          zIndex: 1,
        }}>
          <span style={{
            fontFamily: "monospace", fontSize: 10, fontWeight: 700,
            color: "rgba(216,180,254,0.8)", letterSpacing: 4,
            textTransform: "uppercase",
          }}>POSTAPP</span>
        </div>
      </div>
    </div>
  );
}
