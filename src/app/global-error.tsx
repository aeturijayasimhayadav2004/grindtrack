"use client";

/**
 * Last-resort boundary for errors in the root layout itself (providers, theme).
 * It replaces the whole document, so it can't rely on globals.css or any
 * provider — hence the inline styles.
 */
export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: "100dvh",
          display: "grid",
          placeItems: "center",
          background: "#0f1113",
          color: "#e6e8ea",
          fontFamily: "system-ui, sans-serif",
          padding: 16,
        }}
      >
        <div style={{ maxWidth: 360, textAlign: "center" }}>
          <p style={{ fontWeight: 600, fontSize: 16 }}>Something went wrong</p>
          <p style={{ fontSize: 14, opacity: 0.7 }}>Your saved progress is safe.</p>
          <button
            type="button"
            onClick={reset}
            style={{
              marginTop: 8,
              padding: "6px 14px",
              borderRadius: 6,
              border: "1px solid #3a3f44",
              background: "transparent",
              color: "inherit",
              cursor: "pointer",
            }}
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}
