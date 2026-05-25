export type CourseSlug = string | { current?: string | null } | null | undefined;

export function getCourseSlug(slug: CourseSlug): string {
  if (typeof slug === "string") {
    return slug;
  }

  return slug?.current || "";
}

function getPublicAppUrl(): string {
  const envUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_SITE_URL;

  if (!envUrl) {
    return "";
  }

  const urlWithProtocol =
    envUrl.startsWith("http://") || envUrl.startsWith("https://")
      ? envUrl
      : envUrl.includes("localhost") || envUrl.includes("127.0.0.1")
        ? `http://${envUrl}`
        : `https://${envUrl}`;

  return urlWithProtocol.replace(/\/$/, "");
}

function withPublicOrigin(path: string): string {
  const appUrl = getPublicAppUrl();

  return appUrl ? `${appUrl}${path}` : path;
}

export function getCourseHref(slug: CourseSlug): string {
  const courseSlug = getCourseSlug(slug);

  return withPublicOrigin(courseSlug ? `/academia/${encodeURIComponent(courseSlug)}` : "/academia");
}

export function getCoursePlayerHref(slug: CourseSlug): string {
  const courseSlug = getCourseSlug(slug);

  return withPublicOrigin(
    courseSlug ? `/academia/${encodeURIComponent(courseSlug)}/reproducir` : "/academia"
  );
}
