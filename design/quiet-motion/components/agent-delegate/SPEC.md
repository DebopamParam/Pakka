# Agent delegate

A to-do list you hand to agents: a status pill grows into a live Agents panel, tasks check off and fold away, the result unfolds.

## Anatomy
- Warm, blurred photographic backdrop (beige → umber). Every surface is dark smoked glass: #1c1a18 at 85%, backdrop blur, 18px radius, white 7% inset hairline, deep soft shadow.
- "This week" list: 15px title with a round + button; 44px rows with an 18px ring checkbox, 15px label, and right-side meta (due chip "Friday" in grey or "Today" in blue, a red/amber flag, the agent's icon and a grip once delegated).
- Agent icons: an orange asterisk (spins while working), an indigo orb (breathes), a white cube.

## Flow
1. Clicking rows selects them (row tint white 7%). An orange "✳ Delegate N" pill springs in under the list.
2. Delegate: each selected row gets its agent icon (staggered pops). A small glass pill appears above the list: stacked agent icons, the count, the first agent's current line ("Collecting salary statements"), a grip.
3. After one beat the pill morphs (shared layout) into the Agents panel: header "Agents" with a count badge, one row per agent with its title and a status line that blur-swaps as the agent works.
4. When an agent finishes, its panel row folds away (height → 0, blur), its task's checkbox fills blue with a tick, the label turns blue and a strike-through draws left to right, then the row folds out of the list.
5. With no agents left, the panel morphs back into a pill: "✳ Agent answered ✓".
6. The last task's result unfolds above the list: title + agent icon, "Worked for 2m 14s ›", a summary line, a three-column figures table (Income / Deductions / Refund) and a file row (XLSX tile, name, "Open in ⌄").

## Motion
- Pill ↔ panel ↔ pill is one shared element (layoutId), animating size and radius together (spring 260/28).
- The list card is a layout container, so rows leaving or the result card arriving push everything smoothly.
- Every status line is a blur swap. Strike-through: 350ms, ease [0.2, 0, 0, 1]. Checks and icons: bouncy spring 600/18.
