export const OFFLINE_COPY_MSG = "You're offline and this device doesn't have a saved copy yet — connect once to enable offline use";

const wrap = {
  minHeight: "100dvh",
  width: "100%",
  boxSizing: "border-box",
  background: "#000",
  color: "#A3B6CF",
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  padding: "calc(24px + env(safe-area-inset-top, 0px)) 24px calc(24px + env(safe-area-inset-bottom, 0px))",
  textAlign: "center",
  fontFamily: "system-ui, -apple-system, sans-serif",
  gap: 14,
};

export function BootScreen({ error, onRetry }) {
  const show = !!error;
  const text = typeof error === "string" && error.trim() ? error : OFFLINE_COPY_MSG;
  return (
    <div id="ascend-boot" role="status" style={wrap}>
      <img src="/logo.webp" alt="Ascend" width="90" height="86" style={{ width: 90, height: "auto", opacity: 0.85, filter: "drop-shadow(0 6px 24px rgba(245,210,122,.35))" }} />
      {show ? (
        <>
          <div style={{ color: "#F2F8FF", fontWeight: 700, fontSize: 16 }}>Couldn't load</div>
          <p style={{ margin: 0, maxWidth: 320, lineHeight: 1.45, fontSize: 14 }}>{text}</p>
          {onRetry ? (
            <button
              type="button"
              onClick={onRetry}
              style={{
                marginTop: 4,
                padding: "12px 28px",
                minHeight: 44,
                borderRadius: 12,
                border: "none",
                background: "linear-gradient(180deg,#F5D27A,#C9962E)",
                color: "#1A1204",
                fontWeight: 700,
                fontSize: 16,
              }}
            >
              Retry
            </button>
          ) : null}
        </>
      ) : null}
    </div>
  );
}
