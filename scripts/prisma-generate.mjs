import { spawnSync } from "node:child_process";

if (!process.env.DATABASE_URL) {
  process.env.DATABASE_URL =
    "postgresql://placeholder:placeholder@127.0.0.1:5432/placeholder";
}

const result = spawnSync("prisma", ["generate"], {
  stdio: "inherit",
  env: process.env,
  shell: true,
});

process.exit(result.status ?? 1);
