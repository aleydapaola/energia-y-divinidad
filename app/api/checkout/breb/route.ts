import { NextRequest } from "next/server";

import { oneTimeCheckout } from "@/lib/checkout/one-time-checkout";
export async function POST(request: NextRequest) {
  return oneTimeCheckout(request, "breb");
}
