# Context handoff UI evidence

- Product head: `7fc4b45fea29c4a3fb6d17928498fa1265456d0c`.
- Native bundled app, isolated fixture data, actual inner viewport 2560 × 1440 in both themes. Native screenshot canvas includes 32 px of window decoration.
- Settings shows the effective absolute threshold. Header shows a provider-reported token denominator.
- Narrow 390/320 px, 1920 × 1200, and 200% zoom checks also passed in both themes. No provider/context overlap or horizontal document overflow.
- Final-head native keyboard traversal was unverified because automated Tab did not move focus and native app/window identity verification failed before key dispatch. Earlier broad Settings keyboard evidence passed; final changes preserve focus styles and traversal handlers.
