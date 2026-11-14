import { visionTool } from "@sanity/vision";
import { defineConfig } from "sanity";
import { structureTool } from "sanity/structure";

import { schemaTypes } from "./schemas";
import { studioEnvironment } from "../lib/sanity/studio-environment";

export default defineConfig({
  name: "default",
  ...studioEnvironment({
    projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID,
    dataset: process.env.NEXT_PUBLIC_SANITY_DATASET,
    appUrl: process.env.NEXT_PUBLIC_APP_URL,
  }),
  basePath: "/studio",
  // Private-upload QA: only the embedded Studio connected to EYD Preview.
  auth:
    process.env.NEXT_PUBLIC_SANITY_PROJECT_ID === "81jpalr2" &&
    process.env.NEXT_PUBLIC_SANITY_DATASET === "preview"
      ? { loginMethod: "token" }
      : undefined,
  plugins: [structureTool(), visionTool()],
  schema: { types: schemaTypes },
});
