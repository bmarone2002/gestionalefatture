"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { setClientActiveAction } from "@/server/actions";

export function ToggleClientActiveButton({
  clientId,
  active,
}: {
  clientId: string;
  active: boolean;
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function onClick() {
    const confirmed = window.confirm(
      active
        ? "Disattivare questo cliente? Non comparirà più tra le scadenze da emettere."
        : "Riattivare questo cliente?",
    );
    if (!confirmed) return;
    setPending(true);
    await setClientActiveAction(clientId, !active);
    setPending(false);
    router.refresh();
  }

  return (
    <Button type="button" variant="outline" disabled={pending} onClick={onClick}>
      {active ? "Disattiva cliente" : "Riattiva cliente"}
    </Button>
  );
}
