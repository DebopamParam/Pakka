import type { ReactNode } from 'react'

/** An endless horizontal strip with feathered edges. The content is rendered twice and slid by half its width. */
export function Marquee({
  children,
  seconds = 40,
  reverse = false,
  pauseOnHover = true,
  fade = 96,
  gap = 16,
}: {
  children: ReactNode
  seconds?: number
  reverse?: boolean
  pauseOnHover?: boolean
  fade?: number
  gap?: number
}) {
  return (
    <div
      className={`group flex overflow-hidden ${pauseOnHover ? '[&:hover>div]:[animation-play-state:paused]' : ''}`}
      style={{ maskImage: `linear-gradient(90deg, transparent, #000 ${fade}px, #000 calc(100% - ${fade}px), transparent)` }}
    >
      <style>{`@keyframes marquee-slide { to { transform: translateX(-50%) } } @media (prefers-reduced-motion: reduce) { .marquee-track { animation: none !important } }`}</style>
      <div
        className="marquee-track flex w-max shrink-0"
        // Longhands, not the `animation` shorthand: the shorthand would pin play-state inline and beat the hover pause.
        style={{ animationName: 'marquee-slide', animationDuration: `${seconds}s`, animationTimingFunction: 'linear', animationIterationCount: 'infinite', animationDirection: reverse ? 'reverse' : 'normal' }}
      >
        {[0, 1].map((copy) => (
          <div key={copy} aria-hidden={copy === 1} className="flex shrink-0" style={{ gap, paddingRight: gap }}>
            {children}
          </div>
        ))}
      </div>
    </div>
  )
}

const names = ['Northwind', 'Lumen', 'Kestrel', 'Halcyon', 'Parallax', 'Orbit', 'Fieldnote', 'Tandem']

export default function MarqueeDemo() {
  return (
    <div className="w-[640px] space-y-4">
      <Marquee seconds={24}>
        {names.map((n) => (
          <span key={n} className="px-4 text-[20px] font-semibold tracking-[-0.02em] text-[#111]/35">
            {n}
          </span>
        ))}
      </Marquee>
      <Marquee seconds={30} reverse>
        {names.map((n) => (
          <span key={n} className="rounded-full border border-[#e7e7e5] bg-white px-3 py-1.5 text-[13px] text-[#111]">
            {n}
          </span>
        ))}
      </Marquee>
    </div>
  )
}
