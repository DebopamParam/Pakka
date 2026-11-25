# Hero section

A product hero: a live eyebrow chip, a headline whose object keeps changing, two actions, and the real product UI on a dotted stage.

## Anatomy (centred, max 1120px)
1. Eyebrow chip: white pill with hairline; an `accent` "● New" tag inside, then "Atlas 2.5 is live →".
2. Headline: 72px (clamp 40–72), semibold, tracking -0.035em, line-height 1.02. Line 1 "Ship <word>", line 2 "without the noise." in muted grey.
   The word rotates every 2.2s (releases → onboarding → invoices → the busywork) with a blur swap; a soft `accent` highlighter bar (30%) sits behind its lower third and stretches to the new width.
3. Intro: 17px, muted, max 540px.
4. Actions: ink "Get Atlas free →" (44px pill, dark drop shadow) and white "▶ Watch the 2-min demo".
5. Stage: 28px-radius panel (#efeeeb) with an 18px dot grid and a bottom fade, holding live product UI (here the release island). Show the product, not an illustration.

## Motion
- Mount entrance, not scroll: each block rises from blur 8px + 16px, staggered 70ms, soft spring.
- The rotating word's wrapper animates width with layout (380/32), so line 1 re-centres smoothly.
- Arrows nudge right on hover; buttons press to .97.
