# Quiet Motion: design box

Calm, precise product sites where the real UI is the hero and motion explains state.

**For:** A landing site for a software product (dev tools, productivity, AI agents) that wants to feel calm, crafted and fast.

This box is a reference design bundle: everything you need to design and build a website in this style. It is not a finished site. Use it as direction, not as a template to copy verbatim: keep the language, change the content to fit the product.

## Read in this order

1. `BRIEF.md`: the design direction for the whole site (colour, type, layout, motion, voice, dos and don'ts).
2. `tokens/`: the palette as a Tailwind v4 `@theme` block and as JSON.
3. `example/LandingPage.tsx`: the example page, showing how the components compose and in what order.
4. `components/<id>/`: each component's `SPEC.md` (source of truth for motion) and its code.

There are no screenshots: the example page and the components are working code. Run them, and take screenshots or screen recordings whenever you need to see a layout or a motion, or to compare your build against them.

Code is React 19, Tailwind CSS v4, `motion` (import from "motion/react") and `lucide-react`. Components import each other by relative path, so `components/` and `example/` work as-is in that stack. In any other stack, port them.

## Components

- **Island nav** (section): `components/island-nav/`. A nav that lies flat at the top of the page and gathers into a dark floating island with a live status dot once you scroll.
- **Release island** (component): `components/release-island/`. A dark pill in the app header that fills with the accent as a release runs, with a detail panel that drops out of it.
- **Hero section** (section): `components/hero-section/`. A product hero: a live eyebrow chip, a headline whose object keeps changing, two actions, and the real product UI on a dotted stage.
- **Bento features** (section): `components/bento-features/`. A bento grid where every tile shows its feature working: a filling island, a pixel loader, people filters, rolling counters, agent feeds.
- **Agent delegate** (component): `components/agent-delegate/`. A to-do list you hand to agents: a status pill grows into a live Agents panel, tasks check off and fold away, the result unfolds.
- **Task card** (component): `components/task-card/`. A compact project card that unfolds into a checklist; the footer narrates whatever you hover. Light and dark.
- **Stats band** (section): `components/stats-band/`. A ruled row of big numbers that roll up from zero, odometer-style, the first time they scroll into view.
- **Pricing table** (section): `components/pricing-table/`. Three plans with a monthly/yearly switch: prices roll like an odometer, the discount badge pops, the featured plan is the ink one.
- **Marquee** (primitive): `components/marquee/`. An endless, edge-feathered strip for logos and testimonials that pauses when you hover it.
- **Testimonial wall** (section): `components/testimonial-wall/`. Two rows of quote cards drifting in opposite directions with feathered edges; hovering holds a row still.
- **FAQ accordion** (section): `components/faq-accordion/`. Questions where the open one lifts onto a white card that slides between rows, its answer unfolding out of a blur.
- **CTA capture** (section): `components/cta-capture/`. A closing ink card where the email field morphs into a spinner, then into an accent "you're on the list" pill with a confetti burst.

Building blocks they use:

- **Blur swap text** (primitive): `components/blur-swap/`. Status text that changes with a blur and a small rise instead of a hard cut.
- **Confetti burst** (primitive): `components/confetti-burst/`. A small, quiet success burst of accent flecks from behind a pill.
- **Dot-matrix loader** (primitive): `components/dot-matrix/`. A 5×5 pixel grid: a fading trail coils through it while sending, then a check lights up.
- **Number ticker** (primitive): `components/number-ticker/`. Odometer digits: every digit is a reel that springs to its new place. For prices, stats and counters.
- **Avatar stack** (primitive): `components/avatar-stack/`. Tiny overlapping initials; hovering one lifts it, dims the rest and filters what the card shows.
- **Scroll reveal** (primitive): `components/reveal/`. Blocks rise out of a blur as they scroll into view, once, with a small stagger between siblings.
- **Progress ring** (primitive): `components/progress-ring/`. A thin ring that springs to its new fill, with the count swapping in the middle.
- **Status select** (primitive): `components/status-select/`. Tinted status chips; clicking one opens the other options inline, inside the card.
- **Segmented control** (primitive): `components/segmented-control/`. A pill of options with a white thumb that slides to the active one.
