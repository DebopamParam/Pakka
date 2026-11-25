# Stats band

A ruled row of big numbers that roll up from zero, odometer-style, the first time they scroll into view.

## Anatomy
- Full container width between two hairlines; 4 cells on desktop, 2×2 on phones, separated by vertical hairlines.
- Number at 44px semibold (-0.035em), the unit (s, %, +) in muted grey right after it. Label below, 13.5px muted, max 200px, one concrete claim each.

## Motion
- Numbers roll from 0 with the number ticker once the band is 80px into view (once only). Cells reveal with the usual 60ms stagger.
- Nothing else moves: this band is the calm beat between busier sections.
