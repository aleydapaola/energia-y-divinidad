import { spawn } from "node:child_process";
import { createRequire } from "node:module";

import { vercelMigrationEnvironment } from "./vercel-migration-environment.mjs";

const require = createRequire(import.meta.url);
let env;
try {
  env = vercelMigrationEnvironment(process.env);
} catch (error) {
  console.error(error.message);
  process.exit(1);
}

if (env.VERCEL_ENV === "preview") {
  console.log("Preview migrations: using the verified direct Neon endpoint.");
}
const child = spawn(
  process.execPath,
  [require.resolve("prisma/build/index.js"), "migrate", "deploy"],
  {
    stdio: "inherit",
    env,
  }
);
for (const signal of ["SIGINT", "SIGTERM"]) {
  process.on(signal, () => child.kill(signal));
}
child.on("error", () => {
  console.error("No se ha podido iniciar Prisma Migrate.");
  process.exitCode = 1;
});
child.on("exit", (code, signal) => {
  process.exitCode = code ?? (signal === "SIGINT" ? 130 : 1);
});
