# Release island

A dark pill in the app header that fills with the accent as a release runs, with a detail panel that drops out of it.

## Anatomy
- Header bar of a light app (logo left, pill centred, Share right) over a table of skeleton rows.
- Pill: ink (#111) capsule, 32px tall. Inside, left to right: 24px icon disc (white 20%) with an up arrow, release name, step verb (white 60%), a 14px spinner.
- Progress is the pill's own background: an accent gradient (`accent` → `accent-2`) grows from the left with a 44px feathered leading edge that fades to transparent over the ink.
- Panel (300px, #1b1b1b, 18px radius, white 6% inset hairline) hangs 4px below the pill:
  1. Four-segment stepper (Build, Sign, Notarize, Upload): 3px bars that fill white; labels 11px, done = white 80% with a check, current = white, upcoming = white 35%.
  2. Terminal row (#262626, mono 11px): "› compiling modules▌" typed out at 28ms per character, a live counter on the right (492 / 1,284, 2.2s, 73 MB/s).
  3. "About 10s left" (bold number) on the left, "11%" on the right.
  4. Two buttons: white "View build", dark #2c2c2c "Pause" (toggles to Resume).

## States
running → each step swaps the pill verb and the terminal line → done: the fill covers the pill, the arrow becomes a check, the label becomes "Atlas 2.5 is live", the verb becomes "Live", the spinner closes into a full ring, and the panel says "Shipped just now · 100%" with "Open release" / "Ship 2.6".
About 1.4s after done the panel closes, an accent confetti burst fires from the pill and a "1" badge pops onto Share.
"Ship 2.6" resets everything to 0% with the next version.

## Motion
- Pill width changes animate with layout (spring 380/32); every text change is a blur swap.
- Fill width: spring 200/30, so it glides rather than ticks.
- Panel pours out of the pill: it starts as a pill-sized blob on top of the pill (clip-path inset to the pill's box, 16px round, y -46) and springs open to its full size (260/28). Its contents fade in from blur 6px 120ms later. Closing runs it back into the pill.
- Stepper checks slide in by animating width from 0. Badge and icon swaps use the bouncy spring (600/18).
