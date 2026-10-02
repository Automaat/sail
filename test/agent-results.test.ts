import assert from 'node:assert/strict';
import test from 'node:test';
import {
  loadSpawnReceipts,
  receiptForSource,
  receiptIsSettled,
  saveBoundedReceipt,
  type SpawnReceipt,
} from '../src/lib/agent-results.ts';

const receipt: SpawnReceipt = {
  receiptId: 'request-one',
  project: '/repo',
  sourceId: 'acp:claude:source',
  sourceDirectory: '/repo',
  targetId: 'acp:codex:target',
  targetDirectory: '/repo/task',
  worktreeId: '/repo/task',
  provider: 'codex',
  state: 'completed',
  created: 1,
  updated: 2,
  result: 'Done',
  error: null,
};

await test('spawn receipts stay scoped to the launching source and project', () => {
  assert.deepEqual(
    receiptForSource([receipt], 'request-one', '/repo', receipt.sourceId, '/repo'),
    receipt,
  );
  assert.equal(
    receiptForSource([receipt], 'request-one', '/other', receipt.sourceId, '/repo'),
    null,
  );
  assert.equal(
    receiptForSource([receipt], 'request-one', '/repo', 'acp:claude:other', '/repo'),
    null,
  );
  assert.equal(
    receiptForSource([receipt], 'request-one', '/repo', receipt.sourceId, '/other'),
    null,
  );
  assert.equal(
    receiptForSource([receipt], 'request-two', '/repo', receipt.sourceId, '/repo'),
    null,
  );
});

await test('receipts survive restart with bounded results and honest states', () => {
  const saved = saveBoundedReceipt([], { ...receipt, result: 'x'.repeat(20_000) });
  const restored = loadSpawnReceipts(JSON.stringify(saved));
  assert.equal(restored[0].result?.length, 16_000);
  assert.equal(receiptIsSettled(restored[0].state), true);
  assert.equal(receiptIsSettled('waiting'), false);
  assert.equal(
    loadSpawnReceipts(JSON.stringify([{ ...receipt, state: 'working' }]))[0].state,
    'unavailable',
  );
  assert.deepEqual(loadSpawnReceipts('{invalid'), []);
  assert.deepEqual(loadSpawnReceipts(JSON.stringify([{ ...receipt, targetId: 1 }])), []);
});
