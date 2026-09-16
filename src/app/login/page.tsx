import { redirect } from "next/navigation";
import Image from "next/image";
import { getCurrentUser } from "@/server/require-user";
import { LoginForm } from "@/components/login-form";

export const dynamic = "force-dynamic";

export default async function LoginPage() {
  const user = await getCurrentUser();
  if (user) {
    redirect("/");
  }

  return (
    <div className="relative flex min-h-dvh items-center justify-center overflow-hidden brand-wash p-6">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 brand-grid opacity-40"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -left-24 top-16 size-64 rounded-full bg-brand/15 blur-3xl"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -right-16 bottom-10 size-72 rounded-full bg-primary/10 blur-3xl"
      />

      <div className="relative grid w-full max-w-md gap-8">
        <div className="flex flex-col items-center text-center">
          <Image
            src="/logo-archivia.png"
            alt="Archivia Solution SpA"
            width={220}
            height={90}
            priority
            className="h-14 w-auto object-contain"
          />
          <p className="mt-3 text-sm text-muted-foreground">
            Gestionale interno · fatturazione stoccaggio
          </p>
        </div>
        <LoginForm />
      </div>
    </div>
  );
}
