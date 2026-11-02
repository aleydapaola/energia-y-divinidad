import { newsletterGiftConfiguration } from "@/lib/newsletter-gift-config";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

function unavailable(status = 503) {
  return new Response("El audio no está disponible en este momento. Vuelve a intentarlo.", {
    status,
    headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store" },
  });
}

async function audio(request: Request) {
  const config = newsletterGiftConfiguration();
  if (!config.enabled || !config.giftUrl) {
    return unavailable(404);
  }
  const range = request.headers.get("range");
  // One range only: enough for native audio seeking, with no arbitrary upstream headers/URLs.
  if (range && (!/^bytes=(?:\d{1,12}-\d{0,12}|-\d{1,12})$/.test(range) || range.length > 40)) {
    return unavailable(416);
  }
  try {
    const upstream = await fetch(config.giftUrl, {
      method: request.method === "HEAD" ? "HEAD" : "GET",
      headers: range
        ? { Range: range, "Accept-Encoding": "identity" }
        : { "Accept-Encoding": "identity" },
      redirect: "error",
      cache: "no-store",
      signal: AbortSignal.timeout(45000),
    });
    const contentRange = upstream.headers.get("content-range");
    if (upstream.status === 416) {
      const headers = new Headers({ "Cache-Control": "no-store" });
      if (contentRange && /^bytes \*\/\d+$/.test(contentRange)) {
        headers.set("Content-Range", contentRange);
      }
      await upstream.body?.cancel();
      return new Response(null, { status: 416, headers });
    }
    if (
      ![200, 206].includes(upstream.status) ||
      (upstream.status === 206 && (!contentRange || !/^bytes \d+-\d+\/\d+$/.test(contentRange)))
    ) {
      await upstream.body?.cancel();
      return unavailable();
    }
    const mp3 = new URL(config.giftUrl).pathname.endsWith(".mp3");
    const extension = mp3 ? "mp3" : "m4a";
    const download = new URL(request.url).searchParams.get("download") === "1";
    const headers = new Headers({
      "Content-Type": mp3 ? "audio/mpeg" : "audio/mp4",
      "Content-Disposition": `${download ? "attachment" : "inline"}; filename="meditacion-angel-de-la-guarda.${extension}"`,
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
      "X-Robots-Tag": "noindex, nofollow",
    });
    if (upstream.headers.get("accept-ranges") === "bytes") {
      headers.set("Accept-Ranges", "bytes");
    }
    if (upstream.status === 206 && contentRange) {
      headers.set("Content-Range", contentRange);
    }
    if (request.method === "HEAD") {
      const length = upstream.headers.get("content-length");
      if (length && /^\d+$/.test(length)) {
        headers.set("Content-Length", length);
      }
      return new Response(null, { status: upstream.status, headers });
    }
    if (!upstream.body) {
      return unavailable();
    }
    // Stream the 9.3 MB audio; never buffer it in a function response or embed it in Git.
    return new Response(upstream.body, { status: upstream.status, headers });
  } catch {
    return unavailable();
  }
}

export const GET = audio;
export const HEAD = audio;
