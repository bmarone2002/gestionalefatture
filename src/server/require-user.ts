import { auth } from "@/auth";
import { redirect, unstable_rethrow } from "next/navigation";

export async function getCurrentUser() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return null;
    }
    return session.user;
  } catch (error) {
    unstable_rethrow(error);
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
