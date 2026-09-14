import { redirect } from "next/navigation";
import { getCurrentUser } from "@/server/require-user";
import { LoginForm } from "@/components/login-form";
import { Archive } from "lucide-react";

export default async function LoginPage() {
  const user = await getCurrentUser();
  if (user) {
    redirect("/");
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#f4f1ea] p-6">
      <div className="grid w-full max-w-md gap-6">
        <div className="flex items-center justify-center gap-2 text-[#1c2b38]">
          <Archive className="size-6" />
          <div>
            <div className="text-lg font-semibold">Archivia Solution</div>
            <div className="text-sm text-muted-foreground">Gestionale stoccaggio</div>
          </div>
        </div>
        <LoginForm />
      </div>
    </div>
  );
}
