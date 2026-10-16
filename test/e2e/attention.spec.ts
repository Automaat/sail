import { openThread } from './thread-navigation';
import { browser, $, $$, expect } from '@wdio/globals';
import { execFileSync } from 'node:child_process';
import {
  existsSync,
  mkdtempSync,
  readFileSync,
  realpathSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { ShipIssue, ShipRun } from '../../src/lib/issue-shipping';

const waitForComposer = () =>
  browser.waitUntil(
    () =>
      browser.execute(() =>
        Boolean(
          document.querySelector('.agent-composer [data-pane-prompt][contenteditable="true"]'),
        ),
      ),
    { timeout: 15000, timeoutMsg: 'Agent composer did not become ready' },
  );

async function expectThreadOutcome(title: string, status: string) {
  await browser.waitUntil(
    () =>
      browser.execute(
        (expectedTitle, expectedStatus) => {
          const threads = JSON.parse(localStorage.getItem('sail-agent-threads') ?? '[]');
          const thread = threads.find((item: { title: string }) => item.title === expectedTitle);
          if (!thread) return false;
          const key = JSON.stringify([thread.agent, thread.directory, thread.sessionId]);
          return (
            JSON.parse(localStorage.getItem('sai-thread-attention') ?? '{}')[key]?.status ===
            expectedStatus
          );
        },
        title,
        status,
      ),
    { timeoutMsg: 'Expected persisted thread outcome: ' + title + ' / ' + status },
  );
}

const sendButton = () => $('.agent-actions button:last-child');

const actionDiagnostics = async () =>
  Promise.all(
    (await $$('.agent-actions button')).map(async (button) => ({
      text: await button.getText(),
      enabled: await button.isEnabled(),
    })),
  );

const submitPrompt = async (attempt = 0): Promise<void> => {
  const textarea = $('.agent-composer [data-pane-prompt]');
  await sendButton().waitForEnabled();
  await sendButton().click();
  const accepted = await browser
    .waitUntil(async () => (await textarea.getText()) === '', { timeout: 3000, interval: 100 })
    .then(() => true)
    .catch(() => false);
  if (accepted) return;
  if (attempt < 2) return submitPrompt(attempt + 1);
  console.error('Attention prompt submission diagnostic', {
    actions: await actionDiagnostics(),
    textarea: await textarea.getText(),
  });
  throw new Error('Agent prompt was not accepted');
};

const waitForStopButton = async () => {
  try {
    await expect($('.agent-busy button')).toBeDisplayed();
  } catch (cause) {
    console.error('Attention stop diagnostic', {
      conversation: await $('.agent-conversation').getText(),
      actions: await actionDiagnostics(),
      busy: await $$('.agent-busy').length,
      permissions: await $$('.agent-permission').length,
      textarea: await $('.agent-composer [data-pane-prompt]').getText(),
    });
    throw cause;
  }
};

const waitForTurnIdle = async () => {
  try {
    await browser.waitUntil(
      () =>
        browser.execute(() => {
          const send = document.querySelector<HTMLButtonElement>(
            '.agent-actions button:last-child',
          );
          return Boolean(
            !document.querySelector('.agent-busy') &&
            send &&
            send.textContent?.trim().startsWith('Send'),
          );
        }),
      { timeout: 15000, timeoutMsg: 'Agent turn did not settle' },
    );
  } catch (cause) {
    console.error('Attention turn settlement diagnostic', {
      conversation: await $('.agent-conversation').getText(),
      actions: await actionDiagnostics(),
      busy: await $$('.agent-busy').length,
      permissions: await $$('.agent-permission').length,
    });
    throw cause;
  }
};

describe('agent thread attention', () => {
  const repository = mkdtempSync(join(tmpdir(), 'sail-attention-'));

  before(() => execFileSync('git', ['init', '-q', repository]));
  after(() => rmSync(repository, { recursive: true, force: true }));

  it('tracks hidden permissions and completion until a thread is opened', async () => {
    await browser.execute((path) => {
      sessionStorage.removeItem('sail-e2e-settings');
      localStorage.setItem('sai-directory', path);
      localStorage.setItem(
        'sai-project-catalog',
        JSON.stringify({ repositories: [path], groups: [], worktrees: {} }),
      );
      localStorage.removeItem('sail-agent-threads');
      localStorage.removeItem('sai-thread-attention');
      localStorage.removeItem('sai-collapsed-agent-worktrees');
      localStorage.removeItem('sai-pane-layouts');
      localStorage.setItem('sai-notifications-enabled', 'false');
      localStorage.setItem('sai-notification-sound', 'true');
    }, realpathSync(repository));
    await browser.refresh();
    await browser.waitUntil(
      () =>
        browser.execute(
          (name) => document.querySelector('.breadcrumb-project')?.textContent?.includes(name),
          repository.split('/').at(-1) ?? '',
        ),
      { timeout: 15000, timeoutMsg: 'Test repository did not load' },
    );
    await expect($('.agent-launches button')).toBeEnabled();

    await $('.agent-launches button').click();
    await waitForComposer();
    await $('.agent-composer [data-pane-prompt]').setValue('Stop during setup');
    await submitPrompt();
    await expect($('.agent-header')).toHaveText(expect.stringContaining('Stop during setup'));
    await waitForStopButton();
    await $('.agent-busy button').click();
    await expectThreadOutcome('Stop during setup', 'interrupted');
    await expect($('.agent-composer [data-pane-prompt]')).toHaveText('Stop during setup');

    await $('.agent-launches button').click();
    await waitForComposer();
    await $('.agent-composer [data-pane-prompt]').setValue('Delayed approval');
    await submitPrompt();
    await $('.agent-launches button').click();
    await expect($('[data-topbar-inbox]')).toHaveText('Inbox (1)');
    const worktree = $('.project-default-worktree-select');
    await expect(worktree).not.toHaveAttribute('aria-expanded');
    await worktree.click();
    await expect($('.project-agent-row')).not.toExist();
    await browser.refresh();
    await expect($('[data-topbar-inbox]')).toHaveText('Inbox (1)');
    await expect($('.project-agent-row')).not.toExist();
    await openThread('Delayed approval');
    await expect($('.agent-permission')).toBeDisplayed();
    await expect($('.agent-header .activity-status')).toHaveAttribute('data-state', 'waiting');
    await $('.agent-permission button').click();
    await waitForTurnIdle();

    await $('.agent-composer [data-pane-prompt]').setValue('Delayed completion');
    await submitPrompt();
    await expect($('.agent-permission')).toBeDisplayed();
    await $('.agent-permission button').click();
    await $('.agent-launches button').click();
    await browser.waitUntil(() =>
      browser.execute(() => {
        const threads = JSON.parse(localStorage.getItem('sail-agent-threads') ?? '[]');
        const thread = threads.find((item: { title: string }) => item.title === 'Delayed approval');
        if (!thread) return false;
        const key = JSON.stringify([thread.agent, thread.directory, thread.sessionId]);
        return (
          JSON.parse(localStorage.getItem('sai-thread-attention') ?? '{}')[key]?.status === 'done'
        );
      }),
    );
    await openThread('Delayed approval');
    await expect($('.agent-conversation')).toHaveText(
      expect.stringContaining('Done: Delayed completion'),
    );

    await $('.agent-launches button').click();
    await waitForComposer();
    await $('.agent-composer [data-pane-prompt]').setValue('Slow cancel');
    await submitPrompt();
    await expect($('.agent-permission')).toBeDisplayed();
    await browser.refresh();
    await expect($('.agent-permission')).toBeDisplayed();
    await $('.agent-busy button').click();
    await expectThreadOutcome('Slow cancel', 'interrupted');
    await browser.refresh();
    await expectThreadOutcome('Slow cancel', 'interrupted');
  });
  for (const fixture of [
    { prompt: 'Cancel error', action: 'stop', state: 'interrupted' },
    { prompt: 'Cancel ignored', action: 'stop', state: 'done' },
    { prompt: 'Agent interrupted', action: 'complete', state: 'interrupted' },
    { prompt: 'Agent error interrupted', action: 'complete', state: 'interrupted' },
    { prompt: 'Agent text interrupted', action: 'complete', state: 'interrupted' },
    { prompt: 'Agent text interrupted error', action: 'complete', state: 'interrupted' },
    { prompt: 'Agent text interrupted unrelated error', action: 'complete', state: 'failed' },
    { prompt: 'Discuss interruption', action: 'complete', state: 'done' },
    { prompt: 'Continue after interruption', action: 'complete', state: 'done' },
    { prompt: 'Crash on cancel', action: 'stop', state: 'failed' },
  ]) {
    it('preserves the outcome of ' + fixture.prompt, async () => {
      await $('.agent-launches button').click();
      await waitForComposer();
      await $('.agent-composer [data-pane-prompt]').setValue(fixture.prompt);
      await submitPrompt();
      if (fixture.action === 'stop') {
        await expect($('.agent-permission')).toBeDisplayed();
        await $('.agent-busy button').click();
      }
      await expectThreadOutcome(fixture.prompt, fixture.state);
      await expect($('.project-agent-row')).not.toExist();
      await browser.refresh();
      await expectThreadOutcome(fixture.prompt, fixture.state);
    });
  }

  it('shows an interrupted native child on its transcript card', async () => {
    await $('.agent-launches button').click();
    await waitForComposer();
    await $('.agent-composer [data-pane-prompt]').setValue('Native interrupted subagent');
    await submitPrompt();
    const child = $('.spawn-response:has(.spawn-task[title="Inspect interrupted delegation"])');
    await expect(child.$('.activity-status')).toHaveAttribute('data-state', 'interrupted');
    await expect($('.project-agent-row')).not.toExist();
  });
});

const blocked = (id: string, number: number): ShipIssue => ({
  id,
  number,
  url: `https://github.com/fixture/repo/issues/${number}`,
  title: `Blocked fixture ${number}`,
  dependsOn: [],
  // Keep the attention fixture outside active worker claim recovery.
  state: 'awaiting_merge',
  branch: id,
  path: null,
  receiptId: null,
  threadId: null,
  pullRequest: null,
  error: null,
  reportedStatus: 'blocked',
  blockedReason: `Decide ${id}`,
});

const focusedIssue = () =>
  browser.execute(() => document.activeElement?.getAttribute('data-ship-issue-id') ?? '');

describe('shared attention items', () => {
  const repository = mkdtempSync(join(tmpdir(), 'sail-shared-attention-'));
  const fakeGhDirectory = process.env.SAIL_E2E_FAKE_GH_DIR;
  const fakeGhState = fakeGhDirectory ? join(fakeGhDirectory, 'state.json') : null;
  let previousFakeGhState: string | null = null;
  before(async () => {
    execFileSync('git', ['init', '-q', repository]);
    if (fakeGhDirectory && fakeGhState) {
      if (!existsSync(fakeGhDirectory)) throw new Error('Fake GitHub fixture directory is missing');
      previousFakeGhState = existsSync(fakeGhState) ? readFileSync(fakeGhState, 'utf8') : null;
      writeFileSync(fakeGhState, JSON.stringify({ repository: 'fixture/repo', pulls: {} }));
    }
    await browser.setWindowSize(1280, 850);
  });
  after(async () => {
    try {
      await browser.execute(() => {
        localStorage.removeItem('sai-ship-runs');
        localStorage.removeItem('sai-attention-ledger');
        localStorage.removeItem('sai-notification-prefs');
      });
    } finally {
      if (fakeGhState) {
        if (previousFakeGhState === null) rmSync(fakeGhState, { force: true });
        else writeFileSync(fakeGhState, previousFakeGhState);
      }
      rmSync(repository, { recursive: true, force: true });
    }
  });

  it('counts one list everywhere, opens a clicked Ship notification, and moves with Cmd+J', async () => {
    const path = realpathSync(repository);
    const run: ShipRun = {
      id: 'attention-run',
      source: 'plan',
      repository: path,
      remote: 'fixture/repo',
      provider: 'claude',
      limit: 2,
      approvedAt: 1,
      externalClosed: {},
      issues: [blocked('first', 71), blocked('second', 72)],
    };
    await browser.execute(
      (directory, input) => {
        sessionStorage.removeItem('sail-e2e-settings');
        localStorage.setItem('sai-directory', directory);
        localStorage.setItem(
          'sai-project-catalog',
          JSON.stringify({ repositories: [directory], groups: [], worktrees: {} }),
        );
        localStorage.setItem('sai-ship-runs', input);
        localStorage.removeItem('sai-attention-ledger');
        localStorage.setItem('sai-notifications-enabled', 'false');
      },
      path,
      JSON.stringify([run]),
    );
    await browser.refresh();
    await expect($('.app-shell')).toBeDisplayed();

    await expect($('[data-topbar-inbox]')).toHaveText('Inbox (2)');
    await expect($('.agent-status-bar')).toHaveText(expect.stringContaining('2 need attention'));
    await $('[data-topbar-inbox]').click();
    await expect($('.inbox-header span')).toHaveText('2');
    await expect($$('.inbox-attention')).toBeElementsArrayOfSize(2);
    await expect($('.inbox-group-heading')).toHaveText(path.split('/').at(-1)!);
    await $('[aria-label="Close pending requests"]').click();

    await browser.execute(
      (target) =>
        window.dispatchEvent(new CustomEvent('sail-e2e-notification-click', { detail: target })),
      { type: 'ship-issue', runId: run.id, issueId: 'second', repository: path },
    );
    await expect($('.ship-panel')).toBeDisplayed();
    await browser.waitUntil(() =>
      browser.execute(
        () => document.activeElement?.getAttribute('data-ship-issue-id') === 'second',
      ),
    );
    await expect($('.side-tabs')).toHaveText(expect.stringContaining('Ship runs (2)'));

    await browser.execute(() =>
      window.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'j', metaKey: true, bubbles: true }),
      ),
    );
    await browser.waitUntil(async () => (await focusedIssue()) === 'first');
    await browser.execute(() =>
      window.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'j', metaKey: true, bubbles: true }),
      ),
    );
    await browser.waitUntil(async () => (await focusedIssue()) === 'second');

    await $('[data-topbar-inbox]').click();
    await $('.inbox-attention').$('button=Dismiss').click();
    await expect($('[data-topbar-inbox]')).toHaveText('Inbox (1)');
    await expect($('.agent-status-bar')).toHaveText(expect.stringContaining('1 need attention'));
    await browser.waitUntil(() =>
      browser.execute(() => document.activeElement?.matches('.inbox-attention .inbox-open')),
    );

    await $('.inbox-attention').$('button=Snooze 1 hour').click();
    await expect($('[data-topbar-inbox]')).toHaveText('Inbox (0)');
    await browser.waitUntil(() =>
      browser.execute(() =>
        document.activeElement?.matches(
          '.inbox-dialog-top button[aria-label="Close pending requests"]',
        ),
      ),
    );
  });
});
