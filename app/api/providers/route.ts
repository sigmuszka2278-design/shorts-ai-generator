import { NextResponse } from "next/server";
import { listProviders } from "@/lib/providers";

export const dynamic = "force-dynamic";

export function GET() {
  return NextResponse.json({ providers: listProviders() });
}
