import { defineConfig } from "sanity";
import { structureTool } from "sanity/structure";
import { visionTool } from "@sanity/vision";
import { studioEnvironment } from "../lib/sanity/studio-environment";
import { schemaTypes } from "./schemas";

export default defineConfig({
  name: "default",
  ...studioEnvironment({
    projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID,
    dataset: process.env.NEXT_PUBLIC_SANITY_DATASET,
    appUrl: process.env.NEXT_PUBLIC_APP_URL,
  }),
  basePath: "/studio",
  plugins: [structureTool(), visionTool()],
  schema: { types: schemaTypes },
});
