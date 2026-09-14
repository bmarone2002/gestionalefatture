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
      <body style={{ fontFamily: "sans-serif", padding: 48, textAlign: "center" }}>
        <h1>Si è verificato un errore</h1>
        <p>Ricarica la pagina. Se continua, apri i log del deploy su Railway.</p>
        {error.digest ? <p>Codice: {error.digest}</p> : null}
        <button type="button" onClick={() => reset()}>
          Riprova
        </button>
      </body>
    </html>
  );
}
