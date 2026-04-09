export function TerminalPrompt() {
  return (
    <div style={{
      width: "100%", height: "100vh",
      display: "flex", alignItems: "center", justifyContent: "center",
      background: "#0a0a0a",
    }}>
      <div style={{
        width: 300, height: 300,
        borderRadius: 64,
        background: "linear-gradient(145deg, #0d0d1a 0%, #12122b 50%, #0a0a1f 100%)",
        boxShadow: "0 0 60px rgba(139, 92, 246, 0.25), inset 0 1px 0 rgba(255,255,255,0.06)",
        display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center", gap: 8,
        position: "relative", overflow: "hidden",
      }}>
        {/* Subtle grid overlay */}
        <div style={{
          position: "absolute", inset: 0,
          backgroundImage: "linear-gradient(rgba(139,92,246,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(139,92,246,0.04) 1px, transparent 1px)",
          backgroundSize: "20px 20px",
          borderRadius: 64,
        }} />
        {/* Glow */}
        <div style={{
          position: "absolute", width: 180, height: 180,
          borderRadius: "50%",
          background: "radial-gradient(circle, rgba(139,92,246,0.15) 0%, transparent 70%)",
          top: "50%", left: "50%", transform: "translate(-50%, -60%)",
        }} />
        {/* Prompt symbol */}
        <div style={{
          fontFamily: "'SF Mono', 'Fira Code', monospace",
          fontSize: 80, fontWeight: 700,
          color: "#8b5cf6",
          letterSpacing: -4,
          lineHeight: 1,
          textShadow: "0 0 30px rgba(139,92,246,0.8), 0 0 60px rgba(139,92,246,0.4)",
          zIndex: 1,
        }}>
          &gt;_
        </div>
        {/* App name */}
        <div style={{
          fontFamily: "'SF Mono', monospace",
          fontSize: 13, fontWeight: 600,
          color: "rgba(255,255,255,0.4)",
          letterSpacing: 6,
          textTransform: "uppercase",
          zIndex: 1,
        }}>
          POSTAPP
        </div>
        {/* Bottom accent line */}
        <div style={{
          position: "absolute", bottom: 48, left: "50%", transform: "translateX(-50%)",
          width: 60, height: 2,
          background: "linear-gradient(90deg, transparent, #8b5cf6, transparent)",
          zIndex: 1,
        }} />
      </div>
    </div>
  );
}
