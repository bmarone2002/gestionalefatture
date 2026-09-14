import { auth } from "@/auth";
import { redirect } from "next/navigation";

export async function getCurrentUser() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return null;
    }
    return session.user;
  } catch (error) {
    console.error("Errore sessione:", error);
    return null;
  }
}

export async function requireUser() {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }
  return user;
}
