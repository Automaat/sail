# SAI Harness

A desktop workspace for planning and reviewing coding-agent work. OpenCode runs the agent sessions; SAI Harness manages the workflow around them: plans, reviewer findings, decisions, approvals, and implementation handoff.

## Plan workspace

- Pick a repository, start an Architect chat, and resume earlier plan sessions.
- See live OpenCode messages alongside structured questions, Mermaid diagrams, alternatives, and per-step decisions.
- Send answers, request revisions, or approve a plan for the build agent through [opencode-plugin-plan-review](https://github.com/smykla-skalski/opencode-plugin-plan-review).
- The desktop app starts a local, password-protected OpenCode server and stops it on exit.

## Development

Prerequisites: [mise](https://mise.jdx.dev/), [OpenCode v2](https://opencode.ai/v2/docs/), and the platform dependencies required by [Tauri](https://tauri.app/start/prerequisites/). Configure `opencode-plugin-plan-review` in each repository you want to plan in. Until the plugin is published, use its local checkout in that repository's `opencode.jsonc`:

```jsonc
{ "plugins": ["/absolute/path/to/opencode-plugin-plan-review"] }
```

Mise installs the latest stable Node.js and Rust toolchains. The development task installs JavaScript dependencies when needed.

```sh
mise run dev
```

Select the repository in the app, then describe the work in chat. The first message creates an Architect session. Set `SAI_OPENCODE_BIN` to an absolute path if `opencode` is not on the app's `PATH`.

Other tasks:

```sh
mise run web    # frontend preview; desktop runtime unavailable in a browser
mise run check  # frontend build and Rust check
mise run build  # desktop bundle
```

## Architecture

```text
Svelte + SUI ── OpenCode v2 client ── local OpenCode server
      │                                    └── plan-review plugin RPC + storage
      └── Tauri ── starts/stops server, opens repository picker
```

OpenCode owns sessions and execution. The plan-review plugin owns plans and decisions. SAI Harness renders and submits that workflow in a desktop UI.

## License

MIT
