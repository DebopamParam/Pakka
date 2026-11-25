# Confetti burst

A small, quiet success burst of accent flecks from behind a pill.

- 16 flecks (3–6px, half round, half square) leave the centre of the element on evenly spread angles with jitter.
- The burst is wider than tall (x × 1.6) so it reads as coming off the sides of a pill.
- 900ms, ease [0.1, 0.8, 0.3, 1]: fast out, long settle; opacity 1 → 0, scale .4 → 1, squares spin 180°.
- Accent family only (`accent`, `accent-2`, a pale tint, `accent-ink`). One burst per success; it never loops on its own in a real app.
