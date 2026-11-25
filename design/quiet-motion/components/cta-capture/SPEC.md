# CTA capture

A closing ink card where the email field morphs into a spinner, then into an accent "you're on the list" pill with a confetti burst.

## Anatomy
- Ink card, 32px radius, 80px vertical padding, an `accent` glow (22%) bleeding from the top centre, deep shadow.
- 48px headline in two lines, the second muted ("Ship your next release / quietly."); a muted 16px line with a concrete number.
- Form: a 48px pill (white 8%, white 10% inset hairline), email input, and an `accent` "Get early access →" pill button inside it. Errors sit under it in a soft coral (#ff8a7a).

## Motion
- Submit: the whole pill is one shared element (layoutId). It shrinks into a 48px `accent` circle with a spinner (spring 380/32), then grows into an `accent` pill "✓ You're on the list. See you soon." while a 22-fleck confetti burst fires behind it.
- Invalid email: the pill shakes on x (0, -8, 8, -5, 5, 0 over 400ms) and the error text blur-swaps in. Never a browser validation bubble.
