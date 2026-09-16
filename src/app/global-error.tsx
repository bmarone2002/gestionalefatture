"use client";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="it">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "grid",
          placeItems: "center",
          fontFamily: "system-ui, sans-serif",
          background: "#f2f3f5",
          color: "#1c2b38",
          padding: 32,
          textAlign: "center",
        }}
      >
        <div style={{ maxWidth: 420 }}>
          <div
            style={{
              width: 48,
              height: 48,
              margin: "0 auto 16px",
              borderRadius: 8,
              background: "rgba(180, 144, 96, 0.18)",
              color: "#b49060",
              display: "grid",
              placeItems: "center",
              fontWeight: 700,
            }}
          >
            !
          </div>
          <h1 style={{ fontSize: 22, margin: "0 0 8px" }}>Si è verificato un errore</h1>
          <p style={{ color: "#5b6772", fontSize: 14, margin: "0 0 16px" }}>
            Ricarica la pagina. Se continua, apri i log del deploy su Railway.
          </p>
          {error.digest ? (
            <p style={{ fontFamily: "ui-monospace, monospace", fontSize: 12, color: "#5b6772" }}>
              Codice: {error.digest}
            </p>
          ) : null}
          <button
            type="button"
            onClick={() => reset()}
            style={{
              marginTop: 16,
              border: 0,
              borderRadius: 8,
              background: "#b49060",
              color: "#1c2b38",
              padding: "10px 16px",
              fontSize: 14,
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Riprova
          </button>
        </div>
      </body>
    </html>
  );
}
