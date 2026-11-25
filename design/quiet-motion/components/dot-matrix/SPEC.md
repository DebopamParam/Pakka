# Dot-matrix loader

A 5×5 pixel grid: a fading trail coils through it while sending, then a check lights up.

- 5×5 grid of rounded squares (8px, gap 2px, radius 1.6px). Off cells white at 16%.
- Loading: a 7-cell trail walks the grid in spiral order every 70ms; the head is solid white, the tail fades.
- Done: the trail stops and five cells forming a check pop in one after another (50ms apart, scale .6 → 1.15 → 1).
- Sits alone in the middle of a dark card that has collapsed to a square: it replaces the content while sending.
