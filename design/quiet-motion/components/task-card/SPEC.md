# Task card

A compact project card that unfolds into a checklist; the footer narrates whatever you hover. Light and dark.

## Anatomy
- 300px card, 14px radius, hairline border, the light card shadow. Dark variant: #1b1b1b on #121212, border #2e2e2e.
- Header: progress ring with the done count | "Onboarding flow" (13px medium) over a status chip + "Due Oct 24" (11px muted) | avatar stack.
- Body: five 32px rows: a 14px circle check (fills ink with a white tick when done), 12px label (50% opacity when done), the assignee's avatar on hover.
- Footer: 36px tinted strip; narration text on the left, "Open →" on the right.

## Behaviour
- Clicking the ring or the title collapses or expands the body. Collapsed, the card is just the header.
- Clicking a row toggles it; the ring and its count spring to the new value. All done → the status becomes Done; un-checking from Done → In progress.
- Clicking the status chip grows a row of all four statuses inside the header (it pushes the list down, it never floats).
- Footer narration (blur swap): "3 left" / "All done" by default; hovering a row → "Assigned to Mara" or "Done by Priya"; hovering an avatar → "Mara · 1 of 2 done", and rows that aren't theirs fade to 30%.

## Motion
- The card is a layout container (spring 380/32): every height change, including the status row, glides.
- The row hover highlight is one shared element (layoutId) that slides between rows instead of fading per row.
- Rows enter with blur(3px) + 4px rise, staggered 30ms. The check scales in with the bouncy spring (600/18).
