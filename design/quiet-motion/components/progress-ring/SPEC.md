# Progress ring

A thin ring that springs to its new fill, with the count swapping in the middle.

- SVG circle, 22px, stroke 2px, track at 15% of the ink colour, round caps, starts at 12 o'clock.
- Fill animates pathLength with the soft spring (stiffness 200, damping 26), so it overshoots slightly.
- The number in the middle (10px, semibold, tabular) uses blur swap.
- Without a label it doubles as the island spinner's resting state.
