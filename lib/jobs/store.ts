import { randomUUID } from "node:crypto";

export type JobStatus = "queued" | "running" | "done" | "error";

export interface Job<TResult = unknown> {
  id: string;
  type: "render" | "ai";
  status: JobStatus;
  progress: number; // 0..1
  stage: string; // human readable (Polish)
  createdAt: number;
  updatedAt: number;
  result?: TResult;
  error?: string;
}

// Survive Next.js hot reloads in development.
const globalStore = globalThis as unknown as { __shortsJobs?: Map<string, Job> };
const jobs: Map<string, Job> = (globalStore.__shortsJobs ??= new Map());

const MAX_AGE_MS = 6 * 60 * 60 * 1000;

export function createJob<T>(type: Job["type"], stage: string): Job<T> {
  cleanup();
  const now = Date.now();
  const job: Job<T> = { id: randomUUID(), type, status: "queued", progress: 0, stage, createdAt: now, updatedAt: now };
  jobs.set(job.id, job as Job);
  return job;
}

export function updateJob<T>(id: string, patch: Partial<Job<T>>) {
  const job = jobs.get(id);
  if (!job) return;
  Object.assign(job, patch, { updatedAt: Date.now() });
}

export function getJob<T>(id: string): Job<T> | undefined {
  return jobs.get(id) as Job<T> | undefined;
}

export function activeJobs(type: Job["type"]): number {
  let n = 0;
  for (const j of jobs.values()) if (j.type === type && (j.status === "queued" || j.status === "running")) n++;
  return n;
}

function cleanup() {
  const now = Date.now();
  for (const [id, job] of jobs) if (now - job.updatedAt > MAX_AGE_MS) jobs.delete(id);
}
