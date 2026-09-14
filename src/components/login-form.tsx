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
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle>Accesso</CardTitle>
        <CardDescription>Gestionale interno Archivia Solution</CardDescription>
      </CardHeader>
      <CardContent>
        <form action={action} className="grid gap-4">
          <Field label="Email" htmlFor="email">
            <Input id="email" name="email" type="email" autoComplete="username" required />
          </Field>
          <Field label="Password" htmlFor="password">
            <Input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              required
            />
          </Field>
          {state?.error ? <p className="text-sm text-destructive">{state.error}</p> : null}
          <Button type="submit" disabled={pending}>
            {pending ? "Accesso…" : "Entra"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
