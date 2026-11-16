/** Request-local QA fixture: never changes Sanity or runs for customers/Production. */
type HomeQaContext = {
  mode: unknown;
  environment: string | undefined;
  projectId: string | undefined;
  dataset: string | undefined;
};

export function homePreviewQaRequest(input: HomeQaContext) {
  return (
    input.mode === "home-featured-empty" &&
    input.environment === "preview" &&
    input.projectId === "81jpalr2" &&
    input.dataset === "preview"
  );
}

export function homeEmptyPreviewQa(input: HomeQaContext & { role: string | undefined }) {
  return homePreviewQaRequest(input) && input.role === "ADMIN";
}
