# Plan accept-all manual checks

Tested the isolated, signed macOS app built with `npm run build:e2e`, using the embedded WebDriver and an isolated ACP fixture session. Plan state was seeded through persisted settings; actions were activated through the native app.

- Accept all and start approved both unfinished steps and resumed the agent with the execution prompt
- Completed work stayed done, and draft edits, comments, and general feedback survived approval
- Immediate double activation created exactly one reviewed history entry
- Empty plans and plans with only completed steps kept the action disabled
- A blank edited title blocked execution with a validation error
- An active agent turn blocked execution and retained the review draft
- The behavior scenarios passed again on a second run
- At 390 px and 320 px, document scroll width matched client width and the action row wrapped
- At 200% native zoom, the viewport measured 960 by 549 and document scroll width matched client width
- A targeted Peekaboo Tab reached Accept all and start with `:focus-visible` true and a 2 px focus outline

## Viewport evidence

Measured through `browser.execute(() => ({ width: innerWidth, height: innerHeight, scrollWidth: document.documentElement.scrollWidth, devicePixelRatio }))`. Screenshot pixels were independently checked with `sips -g pixelWidth -g pixelHeight`.

| Requested window | Actual content viewport | Screenshot pixels | Themes         |
| ---------------- | ----------------------- | ----------------- | -------------- |
| 2560 by 1440     | 2560 by 1098            | 5120 by 2260      | Light and dark |
| 1920 by 1200     | 1920 by 1098            | 3840 by 2260      | Light and dark |
| 390 wide         | 390 by 818              | 780 by 1700       | Dark           |
| 320 wide         | 320 by 818              | 640 by 1700       | Dark           |

The display clamped the requested window heights. Full-height 2560 by 1440 and 1920 by 1200 content viewports remain untested. Screenshot pixels include native window decorations and Retina scaling; they are not the content dimensions.

The embedded WebDriver sent Tab without moving focus in the background app. Targeting the private process and window with Peekaboo foreground input verified keyboard reachability and visible focus.

## Supporting checks

- `npm run lint` passed
- `npm test` passed all 1,473 tests
- `npm run build:e2e` passed, including bundled-skill checks, Svelte checks, and the bundled frontend build
