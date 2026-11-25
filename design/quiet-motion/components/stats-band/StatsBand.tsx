import { useEffect, useRef, useState } from 'react'
import { useInView } from 'motion/react'
import { NumberTicker } from '../number-ticker/NumberTicker'
import { Reveal } from '../reveal/Reveal'

type Stat = { value: number; suffix?: string; prefix?: string; label: string }

const stats: Stat[] = [
  { value: 12, suffix: 's', label: 'Average time from merge to live' },
  { value: 1284, label: 'Modules per build, on a laptop' },
  { value: 92, suffix: '%', label: 'Fewer "is it out yet?" messages' },
  { value: 4000, suffix: '+', label: 'Teams shipping with Atlas' },
]

/** A row of big numbers that roll up from zero the first time they scroll into view. */
export function StatsBand({ items = stats }: { items?: Stat[] }) {
  const ref = useRef<HTMLDivElement>(null)
  const seen = useInView(ref, { once: true, margin: '-80px' })
  return (
    <section className="mx-auto max-w-[1120px] px-6 text-[#111]">
      <div ref={ref} className="grid grid-cols-2 border-y border-[#e7e7e5] md:grid-cols-4">
        {items.map((s, i) => (
          <Reveal key={s.label} delay={i * 0.06} className={`px-5 py-8 ${i ? 'md:border-l md:border-[#e7e7e5]' : ''} ${i % 2 ? 'border-l border-[#e7e7e5]' : ''}`}>
            <div className="flex items-baseline text-[44px] font-semibold tracking-[-0.035em]">
              {s.prefix}
              <NumberTicker value={seen ? s.value : 0} />
              <span className="text-[#8a8a87]">{s.suffix}</span>
            </div>
            <div className="mt-2 max-w-[200px] text-[13.5px] leading-snug text-[#77777a]">{s.label}</div>
          </Reveal>
        ))}
      </div>
    </section>
  )
}

export default function StatsBandDemo() {
  const [n, setN] = useState(0)
  useEffect(() => {
    const t = setInterval(() => setN((v) => v + 1), 4000)
    return () => clearInterval(t)
  }, [])
  return (
    <div className="w-[1100px] rounded-[14px] bg-[#f4f4f3] py-12">
      <StatsBand key={n} />
    </div>
  )
}
