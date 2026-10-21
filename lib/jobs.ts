import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

export type Job = { id: string; requirement: string; repository: string; baseBranch: string; model: string; usage: { inputTokens: number; outputTokens: number; totalTokens: number }; status: "queued" | "running" | "completed" | "failed"; logs: string[]; createdAt: string; pullRequestUrl?: string };
const storeDir = path.join(process.cwd(), ".data", "jobs");
const jobPath = (id: string) => path.join(storeDir, `${id}.json`);
export async function saveJob(job: Job) { await mkdir(storeDir, { recursive: true }); await writeFile(jobPath(job.id), JSON.stringify(job, null, 2), "utf8"); }
export async function getJob(id: string) { try { return JSON.parse(await readFile(jobPath(id), "utf8")) as Job; } catch { return null; } }
