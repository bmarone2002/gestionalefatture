import { applyAuthUrlFromEnv } from "@/lib/auth-url";

export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") {
    return;
  }

  const authUrl = applyAuthUrlFromEnv();
  if (authUrl) {
    console.log(`Avvio: AUTH_URL=${authUrl}`);
  } else {
    console.warn("Avvio: AUTH_URL non impostata, uso l'host della richiesta.");
  }

  try {
    const today = new Intl.DateTimeFormat("en-US", {
      timeZone: "Europe/Rome",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(new Date());
    console.log(`Avvio: fuso Europe/Rome ok (${today}), TZ=${process.env.TZ ?? "(non impostato)"}`);
  } catch (error) {
    console.error("Avvio: Intl non supporta Europe/Rome, userò il fallback CET/CEST.", error);
  }
}
