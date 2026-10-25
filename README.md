# NapMap

An ad-free cat-placement logic puzzle that runs entirely in the browser.

Every cat needs a bed of its own. Place one cat in every bed (each patterned area). Each row and column holds exactly one cat, and no two cats may touch, even diagonally.

Play: https://brianjbatchelor.github.io/napmap/

## Layout
- `index.html`: page shell
- `css/style.css`: styles and theme tokens (light and dark)
- `js/generator.js`: puzzle generator and solver (pure, also runs in Node)
- `js/game.js`: game state, rendering and input; exposes `window.NapMap` (alias `window.Sunspots`) with an event bus
- `sw.js`, `manifest.webmanifest`: offline support and home-screen install

## Events
Other modules hook in with `NapMap.on(type, fn)`. Types: `newPuzzle`, `start`, `cat`, `wrong`, `win`, `lose`.
Payload: `{mode, n, seed, dateKey, timeMs, heartsLost}`. The win card has an empty `#win-extra` slot modules can fill.
