import type { NativeSubagentSnapshotSet } from './acp.ts';
import type { TaskScope, TaskSnapshot, TaskStore } from './session-tasks.ts';

type NativeTaskStore = Pick<TaskStore, 'snapshot' | 'start'> & {
  finish(
    scope: TaskScope,
    turnId: string,
    outcome?: 'done' | 'interrupted' | 'failed',
  ): Promise<TaskSnapshot>;
};

export function createNativeTaskReconciler(store: NativeTaskStore) {
  const generations = new Map<string, number>();
  let pending: Promise<unknown> = Promise.resolve();
  return (directory: string, observed: NativeSubagentSnapshotSet) => {
    const operation = pending
      .catch(() => undefined)
      .then(async () => {
        if (observed.generation < (generations.get(directory) ?? -1)) return false;
        await Promise.all(
          observed.subagents.map(async (child) => {
            const scope = {
              agent: child.agent,
              directory: child.directory,
              sessionId: child.sessionId,
            };
            const before = store.snapshot(scope);
            const turn = child.taskIdentity === 'verified' ? (child.taskTurnId ?? null) : null;
            if (before.turnId && before.turnId !== turn)
              await store.finish(
                scope,
                before.turnId,
                child.outcome === 'completed'
                  ? 'done'
                  : child.outcome === 'failed'
                    ? 'failed'
                    : 'interrupted',
              );
            if (turn) await store.start(scope, turn);
          }),
        );
        generations.set(directory, observed.generation);
        return true;
      });
    pending = operation;
    return operation;
  };
}
