import { NextResponse } from "next/server";
import { jsonError } from "@/lib/api";
import { getJob } from "@/lib/jobs/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const job = getJob(id);
  if (!job) return jsonError("Nie znaleziono zadania", 404);
  return NextResponse.json({ job });
}
