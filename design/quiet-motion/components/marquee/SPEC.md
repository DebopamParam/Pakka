# Marquee

An endless, edge-feathered strip for logos and testimonials that pauses when you hover it.

- Content rendered twice side by side; the track translates -50% linearly forever (CSS keyframes, ~40s for a full row), so the loop is seamless.
- Edges fade out over 96px with a mask-image gradient, so items appear and leave softly.
- Pauses on hover (animation-play-state). Rows can run in opposite directions. Stops under prefers-reduced-motion.
