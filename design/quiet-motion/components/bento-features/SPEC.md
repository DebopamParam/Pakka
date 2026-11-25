# Bento features

A bento grid where every tile shows its feature working: a filling island, a pixel loader, people filters, rolling counters, agent feeds.

## Anatomy
- Centred section headline (40px, -0.03em) and a muted 17px intro, max 620px.
- 6-column grid, 16px gap: row 1 = a wide tile (4) + a narrow tile (2); row 2 = three equal tiles (2 each). One column on phones.
- Tile: 24px radius, white with hairline and card shadow (or the dark panel colour for the one "agents" tile, for rhythm). 8px inset; a 176px visual well (#f7f7f6, 18px radius) on top, then a 15px semibold title and a 13.5px muted line.
- Visuals are miniature live versions of real product parts, looping on their own: the release pill filling and naming steps, the dot-matrix loader, a checklist that dims to whoever the avatar stack focuses, an odometer counter, agent rows with rotating asterisks and blur-swapped status lines.

## Motion
- Tiles reveal on scroll, staggered 60ms.
- Hover: the tile lifts 3px (spring 380/32) and a 260px radial spotlight (`accent` 9%, white 6% on dark) follows the pointer.
- Every loop is slow (1.3–2.2s per beat) so the grid feels alive but calm. Never more than one fast thing per tile.
