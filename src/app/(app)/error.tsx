"use client";

export default function AppErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center gap-3 p-8 text-center">
      <h1 className="text-xl font-semibold">Si è verificato un errore</h1>
      <p className="max-w-md text-sm text-muted-foreground">
        La sessione è attiva. Ricarica la pagina. Se continua, controlla i log del deploy su
        Railway.
      </p>
      {error.digest ? (
        <p className="font-mono text-xs text-muted-foreground">Codice: {error.digest}</p>
      ) : null}
      <button
        type="button"
        className="rounded-md bg-[#1c2b38] px-3 py-1.5 text-sm text-white"
        onClick={() => reset()}
      >
        Riprova
      </button>
    </div>
  );
}
