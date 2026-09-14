export type ActionResult<T> =
  | { ok: true; data: T }
  | {
      ok: false;
      error: string;
      code?: string;
      fieldErrors?: Record<string, string[]>;
      details?: {
        remaining?: string;
        invoiceAmount?: string;
        difference?: string;
      };
    };

export function fail(
  error: string,
  extra?: Omit<Extract<ActionResult<never>, { ok: false }>, "ok" | "error">,
): ActionResult<never> {
  return { ok: false, error, ...extra };
}

export function ok<T>(data: T): ActionResult<T> {
  return { ok: true, data };
}
