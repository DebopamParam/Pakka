# Scroll reveal

Blocks rise out of a blur as they scroll into view, once, with a small stagger between siblings.

- From opacity 0, y +16px, blur 8px to rest, with the soft spring (200/26). Fires once, when the block is 60px inside the viewport.
- Siblings stagger by 60ms. Headline first, then intro, then the visual.
- Use it on section content, never on the nav or anything already on screen at load (those get an entrance on mount instead).
