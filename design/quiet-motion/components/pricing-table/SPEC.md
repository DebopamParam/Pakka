# Pricing table

Three plans with a monthly/yearly switch: prices roll like an odometer, the discount badge pops, the featured plan is the ink one.

## Anatomy
- Centred headline + intro, then a segmented control: "Monthly" | "Yearly [-20%]". The `accent` badge only exists while Yearly is active.
- Three equal cards (one column on phones), 24px radius, 24px padding. Side plans: white with hairline. Featured middle plan: ink (#111), big soft shadow, an `accent` "● Most popular" chip, an `accent` CTA.
- Card: plan name (15px semibold), one-line blurb, price at 48px semibold (-0.035em) followed by a muted unit line, a 40px full-width CTA, a hairline, then features with small filled check discs.

## Motion
- Switching billing rolls each price's digits (number ticker) and blur-swaps the unit line ("/ seat / mo, billed yearly").
- The badge pops in and out (width 0 → auto + scale, bouncy spring 600/18).
- Cards reveal on scroll, staggered 60ms; they lift 4px on hover.
