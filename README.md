# SAI Harness

A desktop workspace for planning and reviewing coding-agent work. OpenCode runs the agent sessions; SAI Harness manages the workflow around them: plans, reviewer findings, decisions, approvals, and implementation handoff.

## Current scaffold

- Tauri 2 desktop shell with a Svelte 5 interface and [SUI](https://github.com/smykla-skalski/sui) components.
- Initial workspace screen using the Smyklot palette and a light/dark theme toggle.
- OpenCode server integration is the next implementation step; the UI currently uses illustrative sample data.

## Development

Prerequisites: [mise](https://mise.jdx.dev/) and the platform dependencies required by [Tauri](https://tauri.app/start/prerequisites/). Mise installs the latest stable Node.js and Rust toolchains. The development task installs JavaScript dependencies when needed.

```sh
mise run dev
```

Other tasks:

```sh
mise run web    # frontend in a browser
mise run check  # frontend build and Rust check
mise run build  # desktop bundle
```

## Architecture direction

```text
SolidJS UI ── Tauri commands ── local app services
                                  ├── OpenCode server (HTTP + SSE)
                                  └── local workflow store (plans, reviews, decisions)
```

OpenCode owns agent execution and session state. SAI Harness owns the review workflow and links its records to OpenCode sessions. Keep the plan-review OpenCode plugin useful as a standalone integration.

## License

MIT
