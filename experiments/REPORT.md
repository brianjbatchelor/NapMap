# Furniture-shaped areas: is it viable?

**Short answer: yes, as long as the shapes are "nearly" rectangles, not all perfect ones.** Use the shaped generator at **rectness 0.7** ("Cozy"). Puzzles come out about as hard as today's, a little less likely to need guessing, still never repeat, and each area still reads as one block of furniture (93 to 96% of every area sits inside the block its drawing fills). Generating them takes a few milliseconds up to 9×9. 10×10 is slow (p90 about 3 seconds), so it would need the existing background worker.

Try it: serve the repo and open `experiments/shaped.html` (screenshots: `shaped-light.png`, `shaped-dark.png`).

## The surprise: perfect rectangles never work

If **every** area is a perfect rectangle, a puzzle **never** has exactly one answer. This was checked exhaustively, not by sampling (`rect-only-check.js`):

| Board | Cat layouts | Every way to cut it into rectangles, one cat each | Puzzles with exactly one answer |
|---|---|---|---|
| 5×5 | 14 | 4,124 | **0** |
| 6×6 | 90 | 199,816 | **0** |
| 7×7 | 40 (partial) | 400,000 | **0** |

Every one of them had at least two answers. So a furniture mode has to allow a few cells that break the rectangle look: a notch, a bump, or an L-shaped corner. The question is how few you can get away with. The fewest that work grow with the board size: about 1 cell on 6×6, 4 on 8×8 and 12 on 10×10, spread across the whole board.

## What the knob does

`ShapedGen.generate(n, seed, {rectness})` cuts the board into rectangles around the cats, then nudges edges until exactly one answer is left. "Cells off-rectangle" counts the fewest cells you would add or remove to make every area a clean rectangle.

- **1.0, "Blocks"**: as few off-rectangle cells as possible for the size.
- **0.7, "Cozy"**: allows a handful more, each area at most 3 cells off.
- Lower values give looser blocks. These were not benchmarked.

## Results (200 puzzles for each size and generator)

"Current" is today's live generator, which grows areas freely. Times are from Node on one core of a cloud machine; a phone will be roughly 2 to 4 times slower.

### Generation time and success

| Size | Generator | Puzzles | Median time | p90 time | Unique puzzle on first layout | Layouts tried (avg) |
|---|---|---|---|---|---|---|
| 6×6 | Current (free shapes) | 200 | 0.3 ms | 1.2 ms | 44% | 2.2 |
| 6×6 | Shaped, rectness 1.0 | 200 | 2.7 ms | 6.1 ms | 4% | 14.2 |
| 6×6 | Shaped, rectness 0.7 | 200 | 0.5 ms | 4.8 ms | 31% | 3.3 |
| 7×7 | Current (free shapes) | 200 | 1.1 ms | 12 ms | 30% | 3.6 |
| 7×7 | Shaped, rectness 1.0 | 200 | 8.3 ms | 26 ms | 1% | 29.3 |
| 7×7 | Shaped, rectness 0.7 | 200 | 2.0 ms | 8.6 ms | 9% | 9.1 |
| 8×8 | Current (free shapes) | 200 | 3.1 ms | 14 ms | 16% | 5.4 |
| 8×8 | Shaped, rectness 1.0 | 200 | 21 ms | 58 ms | 0% | 40.1 |
| 8×8 | Shaped, rectness 0.7 | 200 | 6.3 ms | 27 ms | 5% | 15.9 |
| 9×9 | Current (free shapes) | 200 | 17 ms | 103 ms | 12% | 10.3 |
| 9×9 | Shaped, rectness 1.0 | 200 | 99 ms | 245 ms | 0% | 66.3 |
| 9×9 | Shaped, rectness 0.7 | 200 | 74 ms | 373 ms | 1% | 37.9 |
| 10×10 | Current (free shapes) | 200 | 209 ms | 1.2 s | 8% | 19.8 |
| 10×10 | Shaped, rectness 1.0 | 200 | 1.2 s | 4.2 s | 0% | 172.1 |
| 10×10 | Shaped, rectness 0.7 | 200 | 847 ms | 3.2 s | 1% | 132.2 |

### Difficulty (hardest rule a human needs)

| Size | Generator | Single | Line | Group | What-if | Needs guessing | Median steps |
|---|---|---|---|---|---|---|---|
| 6×6 | Current (free shapes) | 4% | 9% | 8% | 73% | 7% | 11 |
| 6×6 | Shaped, rectness 1.0 | 6% | 11% | 2% | 83% | 0% | 11 |
| 6×6 | Shaped, rectness 0.7 | 14% | 15% | 5% | 67% | 0% | 11 |
| 7×7 | Current (free shapes) | 2% | 13% | 13% | 69% | 5% | 12 |
| 7×7 | Shaped, rectness 1.0 | 4% | 13% | 3% | 80% | 1% | 13 |
| 7×7 | Shaped, rectness 0.7 | 6% | 11% | 5% | 78% | 1% | 12 |
| 8×8 | Current (free shapes) | 2% | 12% | 16% | 63% | 8% | 14 |
| 8×8 | Shaped, rectness 1.0 | 6% | 11% | 5% | 78% | 1% | 14 |
| 8×8 | Shaped, rectness 0.7 | 4% | 16% | 6% | 74% | 1% | 14 |
| 9×9 | Current (free shapes) | 2% | 10% | 16% | 69% | 4% | 15 |
| 9×9 | Shaped, rectness 1.0 | 3% | 20% | 7% | 69% | 3% | 16 |
| 9×9 | Shaped, rectness 0.7 | 3% | 17% | 7% | 72% | 2% | 16 |
| 10×10 | Current (free shapes) | 0% | 6% | 23% | 61% | 11% | 17 |
| 10×10 | Shaped, rectness 1.0 | 3% | 24% | 16% | 56% | 2% | 16 |
| 10×10 | Shaped, rectness 0.7 | 1% | 12% | 16% | 71% | 1% | 17 |

### Variety and shape

| Size | Generator | Distinct layouts (area-shape sets) | Distinct area shapes seen | Top-10 shapes cover | Perfect rectangles | Cells off-rectangle per puzzle | Area size spread (avg std dev) | Puzzles with a 1-cell area | Furniture block covers |
|---|---|---|---|---|---|---|---|---|---|
| 6×6 | Current (free shapes) | 200/200 | 582 | 26% | 23% | 9.6 | 3.0 | 35% | 89% |
| 6×6 | Shaped, rectness 1.0 | 184/200 | 191 | 57% | 70% | 2.1 | 3.9 | 49% | 97% |
| 6×6 | Shaped, rectness 0.7 | 200/200 | 330 | 41% | 51% | 3.9 | 3.7 | 64% | 96% |
| 7×7 | Current (free shapes) | 200/200 | 800 | 22% | 20% | 14.1 | 3.8 | 55% | 87% |
| 7×7 | Shaped, rectness 1.0 | 200/200 | 415 | 42% | 55% | 4.4 | 4.8 | 60% | 97% |
| 7×7 | Shaped, rectness 0.7 | 200/200 | 493 | 38% | 48% | 5.4 | 4.7 | 65% | 96% |
| 8×8 | Current (free shapes) | 200/200 | 1039 | 18% | 17% | 20.1 | 4.5 | 47% | 86% |
| 8×8 | Shaped, rectness 1.0 | 200/200 | 706 | 34% | 41% | 7.9 | 5.7 | 60% | 95% |
| 8×8 | Shaped, rectness 0.7 | 200/200 | 770 | 31% | 36% | 9.2 | 5.7 | 67% | 94% |
| 9×9 | Current (free shapes) | 200/200 | 1270 | 16% | 14% | 26.2 | 5.0 | 48% | 85% |
| 9×9 | Shaped, rectness 1.0 | 200/200 | 965 | 27% | 32% | 11.6 | 6.5 | 70% | 94% |
| 9×9 | Shaped, rectness 0.7 | 200/200 | 1008 | 27% | 30% | 12.5 | 6.5 | 63% | 94% |
| 10×10 | Current (free shapes) | 200/200 | 1506 | 15% | 14% | 33.3 | 5.8 | 54% | 84% |
| 10×10 | Shaped, rectness 1.0 | 200/200 | 1206 | 25% | 28% | 15.0 | 7.4 | 72% | 94% |
| 10×10 | Shaped, rectness 0.7 | 200/200 | 1218 | 23% | 24% | 15.7 | 7.3 | 69% | 93% |

How to read the difficulty table. The rater solves each puzzle like a person would, always using the easiest rule that works:
- **Single**: a row, column or area has one open square left.
- **Line**: an area's open squares all sit in one row or column, so the rest of that row or column is crossed out.
- **Group**: the same idea with 2 or more areas sharing the same 2 or more rows or columns.
- **What-if**: "a cat here would leave some area with no room."
- **Needs guessing**: none of these rules are enough.

Each puzzle is filed under the hardest rule it needed.

## What the numbers say

1. **Not easier.** The share of puzzles that need the two hardest rules (what-if or guessing) is about the same as today: 67 to 83% for shaped versus 71 to 80% for current. There are two exceptions. At 6×6, Cozy has more gentle puzzles (29% single or line, versus 13% today). At 10×10, Blocks is easier (58% hard versus 72%).
2. **Less guessing.** Shaped puzzles almost never stall the rules (0 to 3%), while today's generator stalls 4 to 11% of the time. That is a plus for a casual game.
3. **Less use of the "group" rule.** The shaped puzzles lean on "what-if" instead. They are hard in a slightly different way, but no flatter.
4. **Variety is fine.** Every 200-puzzle run produced 200 different layouts, except Blocks at 6×6 (184 of 200). The pool of distinct area shapes is smaller than today's (about half to 80% as many, and only a third at 6×6 with Blocks). Cozy recovers some of it. Area sizes vary more than today, so you get a big couch next to a small cushion, which suits the room idea.
5. **More 1-square areas.** About 0.8 per puzzle versus 0.5 today. Two-thirds of shaped puzzles have one, which gives a free first cat. That is fine for a cushion, but it is worth a tweak if it feels too easy.
6. **Speed.** Shaped generation is slower than today: Cozy takes about 2 times as long up to 8×8 and about 4 times at 9×9 and 10×10, and Blocks takes 6 to 9 times as long. That still means under 0.4 s at the 90th percentile up to 9×9. 10×10 takes about 1 s at the median and 3 to 4 s at p90.

## Recommendation

A furniture-shaped mode is viable. Ship it at **rectness 0.7**. Compared with 1.0 it is 3 to 5 times faster up to 8×8, gives noticeably more shape variety at the small sizes, and still leaves almost every area as a clean block with at most a small notch. Rectness 1.0 is the better pick only if the art direction really needs the cleanest blocks, and then mainly for 8×8 and up, where its variety catches up. Keep 10×10 on the background worker, or leave it out of the room mode. Do not promise "all rectangles": it is mathematically off the table.

## Files

- `generator-shaped.js`: the shaped generator. It has the same output as `generate(n, seed)` and works in Node and the browser.
- `difficulty.js`: the human-style rater, `NapMapRate.rate(puzzle)`.
- `bench.js` and `summarize.js`: they reproduce these tables (`node experiments/bench.js rect07 8 200 > out.json`, then `node experiments/summarize.js <dir>`).
- `rect-only-check.js`: the exhaustive all-rectangles check.
- `shaped.html`: the playable room demo (size 6 to 9, shape setting, Rate readout).
