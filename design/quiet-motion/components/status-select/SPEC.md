# Status select

Tinted status chips; clicking one opens the other options inline, inside the card.

- Chip: 11px medium, 6px radius, icon 11px, tinted background at ~12% of the status colour (20% on dark).
- Four statuses: To do (violet, dashed circle), In progress (amber, dotted circle), In review (blue, eye), Done (green, check circle).
- Opening does not float a menu: a row of all four chips grows in below (height: auto, layout spring 380/32) and the card grows with it.
- Options enter with blur(3px) + 4px rise, staggered 30ms. Picking one collapses the row and the chip morphs (layout) to its new width.
