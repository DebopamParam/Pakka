# FAQ accordion

Questions where the open one lifts onto a white card that slides between rows, its answer unfolding out of a blur.

## Anatomy
- Two columns on desktop (1 : 1.6): headline + "Anything else? Ask us" on the left, the questions on the right. Stacked on phones.
- Rows: 15.5px medium question, a 24px round "+" on the right (black 5%). No dividers. The open row sits on a white card (18px radius, hairline, card shadow).

## Motion
- Only one open at a time. The white card is a single shared element (layoutId) that slides and resizes to the newly opened row (spring 380/32).
- The "+" rotates 45° into a "×" and fills ink.
- Answers: height 0 → auto with the layout spring; the text itself sharpens from blur 4px and settles 4px down.
