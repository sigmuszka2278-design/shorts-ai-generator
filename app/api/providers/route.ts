import { NextResponse } from "next/server";
import { serverRenderEnabled } from "@/lib/config";
import { listProviders } from "@/lib/providers";

export const dynamic = "force-dynamic";

export function GET() {
  return NextResponse.json({ providers: listProviders(), serverRender: serverRenderEnabled() });
}
