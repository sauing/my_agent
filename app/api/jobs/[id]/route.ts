import { NextResponse } from "next/server";
import { getJob } from "@/lib/jobs";

export const runtime = "nodejs";
export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) return NextResponse.json({ error: "Job not found." }, { status: 404 });
  const job = await getJob(id);
  return job ? NextResponse.json(job) : NextResponse.json({ error: "Job not found." }, { status: 404 });
}
