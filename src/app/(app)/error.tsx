"use client";

export default function AppErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center gap-4 p-8 text-center">
      <div className="flex size-12 items-center justify-center rounded-lg bg-brand/15 text-brand">
        <span className="text-lg font-bold">!</span>
      </div>
      <div className="space-y-2">
        <h1 className="text-xl font-semibold tracking-tight">Si è verificato un errore</h1>
        <p className="max-w-md text-sm text-muted-foreground">
          La sessione è attiva. Ricarica la pagina. Se continua, controlla i log del deploy su
          Railway.
        </p>
        {error.digest ? (
          <p className="font-mono text-xs text-muted-foreground">Codice: {error.digest}</p>
        ) : null}
      </div>
      <button
        type="button"
        className="rounded-md bg-brand px-4 py-2 text-sm font-medium text-brand-foreground transition-colors hover:bg-brand/90"
        onClick={() => reset()}
      >
        Riprova
      </button>
    </div>
  );
}
