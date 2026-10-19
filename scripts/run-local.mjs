import { spawn } from "node:child_process";
import { createRequire } from "node:module";

import { assertLocalDatabaseSafety } from "./local-database-safety.mjs";

const require = createRequire(import.meta.url);
const { loadEnvConfig } = require("@next/env");
const [mode, program, ...args] = process.argv.slice(2);
const executables = { next: "next/dist/bin/next", prisma: "prisma/build/index.js" };

if (!["development", "production"].includes(mode) || !Object.hasOwn(executables, program)) {
  console.error("Uso: run-local.mjs development|production next|prisma [argumentos]");
  process.exit(1);
}

// Pass the same resolved environment to Prisma and Next. Checking Next's .env.local
// and then letting Prisma independently load .env would check the wrong connection.
process.env.NODE_ENV = mode;
let loadFailed = false;
loadEnvConfig(process.cwd(), mode === "development", {
  info() {},
  error() {
    loadFailed = true;
  },
});
try {
  if (loadFailed) {
    throw new Error("No se ha podido leer la configuración local.");
  }
  assertLocalDatabaseSafety(process.env);
} catch (error) {
  console.error(error.message);
  process.exit(1);
}

const child = spawn(process.execPath, [require.resolve(executables[program]), ...args], {
  stdio: "inherit",
  env: process.env,
});
for (const signal of ["SIGINT", "SIGTERM"]) {
  process.on(signal, () => child.kill(signal));
}
child.on("error", () => {
  console.error("No se ha podido iniciar la herramienta local.");
  process.exitCode = 1;
});
child.on("exit", (code, signal) => {
  process.exitCode = code ?? (signal === "SIGINT" ? 130 : 1);
});
