"use client";

import { useActionState } from "react";
import { loginAction } from "@/server/actions/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field } from "@/components/forms/field";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

export function LoginForm() {
  const [state, action, pending] = useActionState(loginAction, null);

  return (
    <Card className="w-full max-w-md border-border/80 shadow-sm ring-brand/15">
      <CardHeader className="gap-1.5">
        <CardTitle className="text-xl">Accesso</CardTitle>
        <CardDescription>Inserisci le credenziali operative Archivia Solution</CardDescription>
      </CardHeader>
      <CardContent>
        <form action={action} className="grid gap-4">
          <Field label="Email" htmlFor="email">
            <Input id="email" name="email" type="email" autoComplete="username" required className="h-10" />
          </Field>
          <Field label="Password" htmlFor="password">
            <Input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              required
              className="h-10"
            />
          </Field>
          {state?.error ? <p className="text-sm text-destructive">{state.error}</p> : null}
          <Button type="submit" disabled={pending} className="mt-1 h-10">
            {pending ? "Accesso…" : "Entra"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
