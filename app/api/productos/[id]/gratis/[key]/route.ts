import { freeProductContent } from "@/lib/digital-products/free-product";
import { applyRateLimit } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;
async function content(
  request: Request,
  { params }: { params: Promise<{ id: string; key: string }> }
) {
  const limited = applyRateLimit(request, { maxRequests: 90, windowMs: 60_000 });
  if (limited) {
    return limited;
  }
  const { id, key } = await params;
  if (!/^[A-Za-z0-9_-]{1,150}$/.test(id) || !/^[A-Za-z0-9_-]{1,100}$/.test(key)) {
    return new Response(null, { status: 404 });
  }
  return freeProductContent(request, id, key);
}
export const GET = content;
export const HEAD = content;
