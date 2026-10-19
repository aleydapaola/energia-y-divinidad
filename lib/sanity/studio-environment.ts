/** Shared by the embedded and standalone editors. */
export function studioEnvironment(env: {
  projectId?: string;
  dataset?: string;
  appUrl?: string;
}) {
  const projectId = env.projectId || "81jpalr2";
  const dataset = env.dataset || "preview";
  if (env.appUrl?.includes("-git-preview-") && dataset !== "preview") {
    throw new Error("El editor de Preview requiere el dataset preview. Edición bloqueada.");
  }
  return {
    projectId,
    dataset,
    title:
      dataset === "production"
        ? "Energía y Divinidad — CONTENIDO REAL"
        : "Energía y Divinidad — PRUEBAS — NO REAL",
  };
}
