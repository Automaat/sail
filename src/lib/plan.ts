import type { OpenCodeClient } from './opencode';

export interface PlanStep {
  id: string;
  title: string;
  detail: string;
  rationale?: string;
  files: string[];
  risk: 'low' | 'medium' | 'high';
  diagram?: string;
  needsYou?: string;
  status: string;
  comment?: string;
}

export interface Plan {
  title: string;
  summary: string;
  diagram?: string;
  alternatives?: Array<{ name: string; pros: string[]; cons: string[]; chosen: boolean }>;
  steps: PlanStep[];
  sessionID: string;
  version: number;
  state: 'review' | 'executing' | 'done';
}

export interface PlanQuestion {
  id: string;
  question: string;
  kind: 'text' | 'single' | 'multi' | 'confirm';
  options?: Array<{ value: string; label: string; description?: string }>;
  recommended?: string[];
}

export interface PlanQuestions {
  id: string;
  sessionID: string;
  questions: PlanQuestion[];
}

export interface PlanSnapshot {
  plan: Plan | null;
  questions: PlanQuestions | null;
}

async function call(
  client: OpenCodeClient,
  directory: string,
  method: string,
  input: Record<string, unknown>,
): Promise<unknown> {
  const response = await client.rpc.call({
    rpcID: 'planreview',
    method,
    location: { directory },
    input: input as Parameters<typeof client.rpc.call>[0]['input'],
  });
  return response.output;
}

export async function getPlan(client: OpenCodeClient, directory: string, sessionID: string): Promise<PlanSnapshot> {
  return (await call(client, directory, 'get', { sessionID })) as PlanSnapshot;
}

export async function answerQuestions(
  client: OpenCodeClient,
  directory: string,
  sessionID: string,
  id: string,
  answers: Record<string, string[]>,
): Promise<void> {
  const result = (await call(client, directory, 'answer', { sessionID, id, answers })) as { ok: boolean; error?: string };
  if (!result.ok) throw new Error(result.error ?? 'The answers were not accepted.');
}

export interface PlanDecision {
  stepID: string;
  verdict?: 'approve' | 'reject' | 'revise';
  comment?: string;
}

export async function reviewPlan(
  client: OpenCodeClient,
  directory: string,
  plan: Plan,
  action: 'revise' | 'execute',
  decisions: PlanDecision[],
  note?: string,
): Promise<void> {
  const result = (await call(client, directory, 'review', {
    sessionID: plan.sessionID,
    version: plan.version,
    action,
    decisions,
    note,
  })) as { ok: boolean; error?: string };
  if (!result.ok) throw new Error(result.error ?? 'The review was not accepted.');
}
