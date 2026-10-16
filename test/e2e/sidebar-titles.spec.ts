import { browser, $, $$, expect } from '@wdio/globals';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, realpathSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

describe('worktree-only sidebar', () => {
  const repository = mkdtempSync(join(tmpdir(), 'sail-sidebar-titles-'));
  const other = mkdtempSync(join(tmpdir(), 'sail-sidebar-reference-'));

  before(() => {
    execFileSync('git', ['init', '-q', repository]);
    execFileSync('git', ['init', '-q', other]);
  });

  after(async () => {
    await browser.execute(() => localStorage.clear());
    rmSync(repository, { recursive: true, force: true });
    rmSync(other, { recursive: true, force: true });
  });

  it('keeps native children, nested children and cross-worktree references out of the worktree list', async () => {
    await browser.setWindowSize(1280, 850);
    await browser.execute(
      (path: string, otherPath: string) => {
        sessionStorage.removeItem('sail-e2e-settings');
        localStorage.clear();
        localStorage.setItem('sai-directory', path);
        localStorage.setItem(
          'sai-project-catalog',
          JSON.stringify({ repositories: [path, otherPath], groups: [], worktrees: {} }),
        );
        localStorage.setItem(
          'sail-agent-threads',
          JSON.stringify([
            {
              agent: 'claude',
              directory: path,
              sessionId: 'p',
              title: 'Sail keyboard pass for the sidebar',
              updated: 2,
            },
            {
              agent: 'claude',
              directory: path,
              sessionId: 'c',
              title: 'Subagent reviewing the sidebar layout',
              updated: 3,
            },
            {
              agent: 'claude',
              directory: path,
              sessionId: 'g',
              title: 'Nested review',
              updated: 4,
            },
            {
              agent: 'claude',
              directory: otherPath,
              sessionId: 'r',
              title: 'Cross-worktree review',
              updated: 5,
            },
          ]),
        );
        localStorage.setItem(
          'sai-agent-spawn-receipts',
          JSON.stringify(
            [
              ['native:nested', path, 'p', path, 'c', 'working'],
              ['native:grandchild', path, 'c', path, 'g', 'working'],
              ['reference', path, 'c', otherPath, 'r', 'working'],
              ['native:sibling-a', path, 'c', path, 'a', 'working'],
              ['native:sibling-b', path, 'c', path, 'b', 'working'],
              ['native:waiting-a', path, 'c', path, 'd', 'waiting'],
              ['native:waiting-b', path, 'c', path, 'e', 'waiting'],
              ['native:waiting-c', path, 'c', path, 'f', 'waiting'],
            ].map(([id, sourceDirectory, source, targetDirectory, target, state]) => ({
              receiptId: id,
              accessKey: '',
              requestId: id,
              project: path,
              sourceId: `acp:claude:${source}`,
              sourceDirectory,
              targetId: `acp:claude:${target}`,
              turnId: null,
              targetDirectory,
              worktreeId: null,
              provider: 'claude',
              prompt: 'Review the layout',
              state,
              created: 1,
              updated: Date.now(),
              result: null,
              error: null,
            })),
          ),
        );
      },
      realpathSync(repository),
      realpathSync(other),
    );
    await browser.refresh();
    await expect($$('.project-default-worktree-select')).toBeElementsArrayOfSize(2);
    await expect($('.project-agent-row')).not.toExist();
    await expect($('.project-agent-list')).not.toExist();
    await expect($('.project-agent-history')).not.toExist();
    await expect($('.sidebar')).not.toHaveText(expect.stringContaining('Subagent'));
    await expect($('.project-default-worktree-select')).not.toHaveAttribute('aria-expanded');
    await $('.project-default-worktree-select').click();
    await expect($('.project-agent-row')).not.toExist();
    await browser.refresh();
    await expect($('.project-agent-row')).not.toExist();
  });
});
