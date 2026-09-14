import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { normalizeAuthUrl } from "@/lib/auth-url";

describe("AUTH_URL", () => {
  it("aggiunge https se manca lo schema", () => {
    assert.equal(
      normalizeAuthUrl("gestionalefatture-production-dc04.up.railway.app"),
      "https://gestionalefatture-production-dc04.up.railway.app",
    );
  });

  it("non modifica un URL già valido e toglie lo slash finale", () => {
    assert.equal(
      normalizeAuthUrl("https://gestionalefatture-production-dc04.up.railway.app/"),
      "https://gestionalefatture-production-dc04.up.railway.app",
    );
  });
});
