# Quiet Motion: design brief

## The idea
The product sells itself by being shown working. Every section puts a piece of real, live UI on screen (a release
pill filling up, agents narrating their work, a checklist ticking itself off) instead of illustrations, stock photos or
icon grids. Around that UI, the page stays quiet: warm off-white, ink type, lots of air, one accent at a time.
Motion is never decoration. It explains a change of state: something started, progressed, finished, moved.

## Mood
Calm, precise, tactile, confident. Think a well-made Mac app, not a crypto launch. Nothing shouts; things settle.

## Colour
- Page: warm off-white canvas (#f4f4f3). Cards are white with a hairline (#e7e7e5) and a barely-there shadow.
- Ink (#111) for type and for the "important" surfaces: the nav island, the featured plan, the closing CTA card.
- Floating product UI is dark: panel #1b1b1b, raised rows #262626, white at 6–8% for hairlines.
- One accent, a violet-to-orchid gradient: `accent` #7b5cff → `accent-2` #d16bff. It means progress, live and the
  main call to action. Fills (progress, the success pill) run the gradient left to right with the bright orchid at the
  leading edge; dots, chips and small marks use flat violet; accent text on white uses `accent-ink` (#5b3fd9), and on
  dark panels `accent-soft` (#b9a6ff). Components read these as CSS variables, so never hard-code the hex.
- Blue (#2f80ff) is for in-product primary actions. Orange (#ff5b2e) only ever means "an agent is doing this".
- Status tints at ~12% of their colour for chips (violet to-do, amber in progress, blue review, green done).

## Type
Inter throughout, JetBrains Mono for anything that is machine output (terminal lines, counters).
- Display 72px / semibold / -0.035em / 1.02 line-height. Section headlines 40px / -0.03em.
- Second lines of headlines go muted grey ("Ship releases / without the noise."). It's the house signature.
- Body 15–17px, muted (#77777a) for intros. UI text inside product components stays small (11–13px), as in the app.
- Numbers are always tabular.

## Layout
- 1120px container, 24px gutters (16 on phones), 128px between sections (80 on phones).
- Centre-aligned headline blocks over full-width content; alternate text/visual left-right for showcase rows.
- Bento grids on a 6-column grid with 16px gaps; tiles have a visual well on top and two lines of copy below.
- Radii grow with size: chips 6, buttons pill, cards 14–24, big feature stages and the CTA card 28–32.
- Recommended page order: island nav, hero with live product stage, logo marquee, bento features, showcase rows
  (agents, checklists), stats band, pricing, testimonial wall, FAQ, CTA capture, footer with a giant faint wordmark.

## Motion
- Springs, not easings: snappy 520/34 (pills, thumbs), layout 380/32 (anything that changes size), soft 200/26
  (entrances, fills), bouncy 600/18 (checks, badges).
- Text never hard-cuts. Changing words blur-swap (blur 4px, 5px rise, 220ms).
- Size changes are animated with layout: cards grow, pills morph into panels, forms shrink into spinners.
- Sections reveal once on scroll (blur 8px + 16px rise, 60ms stagger). The hero animates on mount instead.
- Live loops are slow (1.3–2.2s per beat) and there is only one fast thing on screen at a time.
- Success gets one small moment (confetti burst, check pop, badge), never a modal.
- Honour prefers-reduced-motion: keep state changes, drop the travel and the loops.

## Voice
Short, concrete, a little dry. Numbers over adjectives ("12s from merge to live", not "blazing fast").
Headlines are a promise in five words or fewer, plus a muted second line.

## Do
- Show the actual product UI, live, in every section.
- Keep one accent colour per view; let ink and white do the rest.
- Make every interactive thing respond physically (press to .96–.97, hover lifts 3–4px, arrows nudge 2px).

## Don't
- No gradients on text, no glow-everything, no glassmorphism on the light page (smoked glass belongs to floating dark UI).
- No icon-in-a-circle feature grids, no stock illustrations, no carousels.
- No animation that runs just because: if nothing changed state, nothing moves.
