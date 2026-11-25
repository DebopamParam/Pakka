# Blur swap text

Status text that changes with a blur and a small rise instead of a hard cut.

- Outgoing text: opacity 1 → 0, y 0 → -5px, blur 0 → 4px.
- Incoming text: opacity 0 → 1, y 5px → 0, blur 4px → 0.
- 220ms, ease [0.2, 0, 0, 1]. Both overlap in one grid cell, so the box takes the wider word while crossing.
- Use for any label that changes on its own: step names, agent status lines, counters with words.
