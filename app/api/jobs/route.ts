import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { saveJob, type Job } from "@/lib/jobs";
import { runJob } from "@/lib/worker";
import { accessToken, modelCatalog } from "@/lib/chatgpt-auth";

export const runtime = "nodejs";
export async function POST(request: Request) {
  const body = await request.json().catch(() => null) as { requirement?: string; repository?: string; baseBranch?: string; model?: string } | null;
  const requirement = body?.requirement?.trim();
  const repository = body?.repository?.trim();
  const baseBranch = body?.baseBranch?.trim();
  const model = body?.model;
  if (!requirement || requirement.length < 10 || requirement.length > 10000) return NextResponse.json({ error: "Enter a requirement between 10 and 10,000 characters." }, { status: 400 });
  if (!repository || !/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(repository)) return NextResponse.json({ error: "Use GitHub repository format owner/name." }, { status: 400 });
  if (!baseBranch || baseBranch.length > 200 || baseBranch.startsWith("-") || /[\r\n\0]/.test(baseBranch)) return NextResponse.json({ error: "Enter a valid base branch." }, { status: 400 });
  if (!model) return NextResponse.json({ error: "Choose an available model." }, { status: 400 });
  const catalog = await modelCatalog();
  if (!catalog.connected) return NextResponse.json({ error: "Connect your ChatGPT account first." }, { status: 503 });
  if (!catalog.models.some(option => option.slug === model)) return NextResponse.json({ error: "That model is not available to your ChatGPT account. Refresh the page and choose an available model." }, { status: 400 });
  try { await accessToken(); } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Reconnect ChatGPT and try again." }, { status: 503 }); }
  if (!process.env.GITHUB_TOKEN) return NextResponse.json({ error: "Set GITHUB_TOKEN in .env.local with repository contents and pull request permissions." }, { status: 503 });
  const job: Job = { id: randomUUID(), requirement, repository, baseBranch, model, usage: { inputTokens: 0, outputTokens: 0, totalTokens: 0 }, status: "queued", logs: ["Task queued."], createdAt: new Date().toISOString() };
  await saveJob(job);
  void runJob(job).catch(async (error: unknown) => { job.status = "failed"; job.logs.push(`Stopped: ${error instanceof Error ? error.message : "Unexpected worker error."}`); await saveJob(job); });
  return NextResponse.json(job, { status: 202 });
}
