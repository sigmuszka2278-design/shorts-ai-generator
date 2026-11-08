import { NextResponse } from "next/server";
import { listVideos } from "@/lib/render/storage";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({ videos: await listVideos(12) });
}
