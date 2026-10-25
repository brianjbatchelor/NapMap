# QA sweep (2026-10-25, branch `qa`)

Tooling lives in `.qa/` (git-ignored): Playwright scripts `play.py`, `edge.py`, `offline.py`, `a11y.py`, `archive.py`, `hint.py`, `ghost.py`, `swbump.py`, plus axe-core 4.x from npm.

## What was tested

| Area | Coverage |
|---|---|
| Automated play | 48 puzzles per run (6, 7, 8, 9, 10, daily, rotating) x 4 viewports (360x740, 390x844, 768x1024, 1280x800) x light/dark; touch at phone widths, mouse at others. Run at `/` and under the subpath `/wt-qa/`. Each puzzle used double-tap placement plus some of: wrong guesses, drag-cross a row, undo, hint. Each context also covered losing all hearts, Try again, losing again, Show solution, and Restart (after reveal and mid-game). |
| Keyboard | Arrows, Space/x, Enter/c, Ctrl+C on a cell, focus after win/lose, card buttons |
| Archive | Opening 3 past dailies per context (Sep, Jul, Apr), solving them, month nav, Arrow/PageDown keys, backdrop close, Esc returning focus |
| Mode switching | Mid-game switch, 10x10 still generating then picking 7, tapping 10x10 twice |
| Offline | Load, go offline, reload, play, generate 10x10 in the worker, `?g=` invite URL, `index.html`; at root and subpath. Every same-origin request is in SHELL. Bumping VERSION was tested against a `max-age=600` server. |
| Edge cases | 4 quick taps, taps during the win animation, the winning tap under the card button, Date overridden across midnight, localStorage throwing, 280/320px widths, right-click/long-press, reduced motion, iOS touch-action |
| Checks | Console and page errors (none apart from Playwright's own SW-blocked warning), horizontal scroll, controls clipped or overlapping the board, card clipped by the board |

## Bugs found and fixed
1. Switching size while a 10x10 was generating left the "Fluffing the pillows" veil over the new board for good (`js/game.js`).
2. Ctrl/Cmd+C on a focused cell placed a cat, which cost a heart if wrong; Ctrl+X crossed it out (`js/game.js`).
3. Right-click marked cells, and two right-clicks placed a cat; long-press opened the context menu/callout over the board (`js/game.js`, `css/style.css`).
4. The ARIA grid was invalid (gridcells with no rows), and `#hearts` had a prohibited aria-label. Rows now use `display:contents`, so the layout is unchanged (`js/game.js`, `index.html`, `css/style.css`).
5. Solved days in the dark-mode archive had 2.4 to 3.7:1 text contrast (`css/archive.css`).
6. Cell focus ring was clipped and painted over by neighbouring cells, and the amber focus colour was 1.8:1 on the light background. Added a `--focus` token (`css/*.css`).
7. Hint silently stopped working once a solution square had been crossed out (`js/game.js`).
8. Keyboard focus stayed under the win/lose card. It now moves to the card and back to the board afterwards (`js/game.js`).
9. The streak display kept showing an old streak after missed days (`js/game.js`).
10. The service worker precache went through the HTTP cache, so a VERSION bump could re-cache stale files under Pages' max-age=600 (`sw.js`).
11. At 280px wide the lose card overflowed the board and hid Show solution (`css/style.css`).
12. iOS double-tap zoom when tapping Undo/Hint quickly (`touch-action:manipulation` on the root, pinch zoom kept) (`css/style.css`).
13. No `main` landmark, and the headings went h1 to h3 (`index.html`, `css/style.css`, `js/leaderboard.js`).
14. Ghost click: on touch, the click the browser fires after the winning (or third wrong) tap landed on the card that tap had just opened, pressing Next puzzle/Try again at once (5/5 repro with the last cat under the button) (`js/game.js`).
15. Today's daily solved just after midnight didn't count toward the streak (`js/game.js`).

SW VERSION bumped to `napmap-v7` once at the end.

## Left unfixed
- **axe `label-content-name-mismatch` (serious) on solved archive days.** The visible time "1:01" appears in the aria-label as "solved in 1:01", but axe's matcher doesn't accept it (tried aria-hidden and spacing). The label is more descriptive than the visible text, and speech-input users can still say the day number, so I left it alone instead of making the label worse.
- **Win/lose card is not a modal dialog.** Focus now moves to it, but it is still a group inside the page, and Tab can reach the controls behind it. Making it a real `<dialog>` would mean reworking `showCard` and the overlay styling.
- **Leaderboard** was only checked in its "not set up" state, since `config.js` is empty. That state renders quietly with no errors, including when localStorage throws.

## Accessibility results (axe-core, main page, board with marks, win card, archive dialog, light and dark)
- Before: 3 critical issues (grid structure, ×64 nodes), 2 serious (hearts aria-label, dark-archive contrast), plus moderate landmark and heading-order issues.
- After: 0 violations on the main page, the board and the win card in both schemes. On the archive, only the one name-mismatch above remains.
- Manual: the archive opens with focus on the current day, Esc returns focus to the Archive button, focus rings are visible and at least 3:1 on every control, and with `prefers-reduced-motion` no animations run (pop, shake, hint glow, celebration, dialog).
