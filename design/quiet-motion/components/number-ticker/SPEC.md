# Number ticker

Odometer digits: every digit is a reel that springs to its new place. For prices, stats and counters.

- Each digit is a 1ch × 1em window over a vertical 0–9 reel; the reel moves by -digit em with the soft spring (200/26), so changes roll and slightly overshoot.
- Separators (commas, %, $) are plain text. Reels are keyed from the right, so 24 → 1,284 grows new reels on the left instead of re-rolling every digit.
- Always tabular numerals. Put aria-label on the wrapper with the formatted value.
- Use for price changes (monthly ↔ yearly), stats counting up when they scroll into view, and live counters.
