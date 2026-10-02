export type SpawnState =
  | 'queued'
  | 'starting'
  | 'working'
  | 'waiting'
  | 'completed'
  | 'failed'
  | 'interrupted'
  | 'unavailable';

export type SpawnReceipt = {
  receiptId: string;
  project: string;
  sourceId: string;
  sourceDirectory: string;
  targetId: string | null;
  targetDirectory: string | null;
  worktreeId: string | null;
  provider: 'claude' | 'codex' | 'opencode';
  state: SpawnState;
  created: number;
  updated: number;
  result: string | null;
  error: string | null;
};

const states = new Set<SpawnState>([
  'queued',
  'starting',
  'working',
  'waiting',
  'completed',
  'failed',
  'interrupted',
  'unavailable',
]);

export function loadSpawnReceipts(raw: string | null): SpawnReceipt[] {
  try {
    const value: unknown = JSON.parse(raw ?? '[]');
    if (!Array.isArray(value)) return [];
    const receipts: SpawnReceipt[] = value.filter(
      (item): item is SpawnReceipt =>
        typeof item === 'object' &&
        item !== null &&
        typeof item.receiptId === 'string' &&
        typeof item.project === 'string' &&
        typeof item.sourceId === 'string' &&
        typeof item.sourceDirectory === 'string' &&
        (item.targetId === null || typeof item.targetId === 'string') &&
        (item.targetDirectory === null || typeof item.targetDirectory === 'string') &&
        (item.worktreeId === null || typeof item.worktreeId === 'string') &&
        ['claude', 'codex', 'opencode'].includes(String(item.provider)) &&
        states.has(item.state) &&
        typeof item.created === 'number' &&
        typeof item.updated === 'number' &&
        (item.result === null || typeof item.result === 'string') &&
        (item.error === null || typeof item.error === 'string'),
    );
    for (const receipt of receipts) {
      if (!receiptIsSettled(receipt.state)) receipt.state = 'unavailable';
    }
    return receipts;
  } catch {
    return [];
  }
}

export function saveBoundedReceipt(
  receipts: SpawnReceipt[],
  receipt: SpawnReceipt,
): SpawnReceipt[] {
  const bounded = {
    ...receipt,
    result: receipt.result?.slice(-16_000) ?? null,
    error: receipt.error?.slice(0, 2_000) ?? null,
  };
  return [bounded, ...receipts.filter((item) => item.receiptId !== receipt.receiptId)].slice(
    0,
    200,
  );
}

export function receiptForSource(
  receipts: SpawnReceipt[],
  receiptId: string,
  project: string,
  sourceId: string,
  sourceDirectory: string,
): SpawnReceipt | null {
  return (
    receipts.find(
      (item) =>
        item.receiptId === receiptId &&
        item.project === project &&
        item.sourceId === sourceId &&
        item.sourceDirectory === sourceDirectory,
    ) ?? null
  );
}

export function receiptIsSettled(state: SpawnState): boolean {
  return ['completed', 'failed', 'interrupted', 'unavailable'].includes(state);
}
