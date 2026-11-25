# Island nav

A nav that lies flat at the top of the page and gathers into a dark floating island with a live status dot once you scroll.

## Anatomy
- At top: transparent, 56px, full container width (1120px): logo + wordmark left, links centred, "Sign in" + an ink "Get Atlas →" pill right.
- Scrolled (> 48px): the same element shrinks to its content and becomes an ink island (#111 at 92%, backdrop blur, float shadow, white 6% inset hairline), 44px tall, centred, 12px from the top.
  The wordmark grows a status ("● 2.5 is live", pulsing `accent` dot), "Sign in" drops out, links go white 75%, and the CTA turns `accent`.

## Motion
- The island is an empty background layer that morphs to the nav's box with layout (spring 380/32). Nothing sits inside
  it, so nothing stretches. The groups (wordmark, links, actions) glide with layout="position" on the same spring.
- Nothing changes width while the nav morphs: "Sign in" and the status pop in and out of flow (AnimatePresence
  popLayout) and only fade + blur 4px, so the end layout is known up front and nothing jumps mid-morph.
- Ink fades in 60ms after the shrink starts (240ms) so the bar never shows as a full-width grey slab; it fades out in
  140ms when expanding. Text colours cross-fade (200ms) instead of flipping.
- Link hover: a single pill (black 5% / white 12%) slides between links (layoutId, 520/34).
- The CTA arrow nudges 2px right on hover.
- On phones the links hide; the island keeps the wordmark, status and CTA.
