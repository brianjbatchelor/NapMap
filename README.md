# Sunspots

An ad-free cat-placement logic puzzle that runs entirely in the browser.

Place one cat in every colored patch. Each row and column holds exactly one cat, and no two cats may touch, even diagonally.

Play: https://brianjbatchelor.github.io/sunspots/

## Layout
- `index.html`: page shell
- `css/style.css`: styles and theme tokens (light and dark)
- `js/generator.js`: puzzle generator and solver (pure, also runs in Node)
- `js/game.js`: game state, rendering and input; exposes `window.Sunspots` with an event bus
- `sw.js`, `manifest.webmanifest`: offline support and home-screen install

## Events
Other modules hook in with `Sunspots.on(type, fn)`. Types: `newPuzzle`, `start`, `cat`, `wrong`, `win`, `lose`.
Payload: `{mode, n, seed, dateKey, timeMs, heartsLost}`. The win card has an empty `#win-extra` slot modules can fill.
