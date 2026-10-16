import assert from 'node:assert/strict';
import { after, before, test } from 'node:test';
import { svelte } from '@sveltejs/vite-plugin-svelte';
import { createServer, type ViteDevServer } from 'vite';

let vite: ViteDevServer;
let renderSidebar: (grouped: boolean, compact: boolean) => string;

before(async () => {
  vite = await createServer({
    configFile: false,
    plugins: [svelte()],
    appType: 'custom',
    logLevel: 'silent',
    server: { middlewareMode: true, watch: null, hmr: false },
  });
  const { default: ProjectSidebar } = await vite.ssrLoadModule('/src/ProjectSidebar.svelte');
  const { render } = await vite.ssrLoadModule('svelte/server');
  renderSidebar = (grouped, compact) =>
    render(ProjectSidebar, {
      props: {
        compact,
        catalog: {
          repositories: ['/repo'],
          groups: grouped
            ? [{ id: 'work', name: 'Work', collapsed: false, repositories: ['/repo'] }]
            : [],
          worktrees: { '/repo': [{ path: '/repo/feature', branch: 'feature' }] },
        },
        directory: '/repo/feature',
        disabled: false,
        agents: [],
        worktreeDialogRequest: null,
        worktreeCreations: [],
        worktreeDeletions: {},
        worktreeAutodiscoveryEnabled: false,
        threads: {
          '/repo/feature': [
            { agent: 'claude', sessionId: 'parent', title: 'Parent session', updated: 1 },
            { agent: 'claude', sessionId: 'child', title: 'Child session', updated: 2 },
          ],
        },
      },
    }).body;
});

after(async () => {
  await vite?.close();
});

for (const grouped of [false, true]) {
  for (const compact of [false, true]) {
    await test(`worktree navigation excludes sessions: grouped=${grouped}, compact=${compact}`, () => {
      const html = renderSidebar(grouped, compact);

      assert.match(html, /feature/);
      assert.match(html, /aria-current="page"/);
      assert.doesNotMatch(html, /Parent session|Child session|project-agent|rail-thread/);
      assert.doesNotMatch(html, /project-agents-|historical subagent/);
    });
  }
}
