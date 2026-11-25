import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react'
import { motion } from 'motion/react'
import { ArrowRight, Play } from 'lucide-react'
import { BlurSwap } from '../blur-swap/BlurSwap'
import { ReleaseIsland } from '../release-island/ReleaseIsland'

const enter = (i: number) => ({
  initial: { opacity: 0, y: 16, filter: 'blur(8px)' },
  animate: { opacity: 1, y: 0, filter: 'blur(0px)' },
  transition: { type: 'spring', stiffness: 200, damping: 26, delay: 0.1 + i * 0.07 },
}) as const

/**
 * The rotating word. Its box springs between the measured widths of the words, so the centred line glides instead of
 * jumping when a longer or shorter word crosses in; the highlight rides the box.
 */
function RotatingWord({ words, i }: { words: string[]; i: number }) {
  const ruler = useRef<HTMLSpanElement>(null)
  const [widths, setWidths] = useState<number[]>([])
  useLayoutEffect(() => {
    const measure = () => setWidths([...ruler.current!.children].map((c) => (c as HTMLElement).offsetWidth))
    measure()
    document.fonts.ready.then(measure)
  }, [words])
  return (
    <motion.span
      className="relative isolate inline-block text-left align-bottom"
      initial={false}
      animate={widths.length ? { width: widths[i] } : undefined}
      transition={{ type: 'spring', stiffness: 380, damping: 34 }}
    >
      <span ref={ruler} aria-hidden className="pointer-events-none invisible absolute top-0 left-0 flex">
        {words.map((w) => (
          <span key={w} className="whitespace-nowrap">
            {w}
          </span>
        ))}
      </span>
      <BlurSwap text={words[i]} />
      <span className="absolute inset-x-0 bottom-[0.06em] -z-10 h-[0.22em] rounded-full bg-accent/30" />
    </motion.span>
  )
}

/** A product hero: live eyebrow, a headline whose verb object keeps changing, two actions, and the real product UI on a stage. */
export function HeroSection({
  words = ['releases', 'onboarding', 'invoices', 'the busywork'],
  eyebrow = 'Atlas 2.5 is live',
  sub = 'Atlas runs your release pipeline and hands the chores to agents, then tells you exactly what happened. No dashboards to babysit.',
  children,
}: {
  words?: string[]
  eyebrow?: string
  sub?: string
  children?: ReactNode
}) {
  const [i, setI] = useState(0)
  useEffect(() => {
    const t = setInterval(() => setI((n) => (n + 1) % words.length), 2200)
    return () => clearInterval(t)
  }, [words.length])

  return (
    <section className="mx-auto flex max-w-[1120px] flex-col items-center px-6 pt-20 pb-8 text-center text-[#111]">
      <motion.a
        {...enter(0)}
        href="#"
        className="group flex items-center gap-2 rounded-full border border-[#e7e7e5] bg-white py-1 pr-3 pl-1.5 text-[12.5px] font-medium shadow-[0_1px_2px_rgba(0,0,0,.04)]"
      >
        <span className="flex items-center gap-1.5 rounded-full bg-accent/12 px-2 py-0.5 text-accent-ink">
          <span className="size-1.5 rounded-full bg-accent" /> New
        </span>
        {eyebrow}
        <ArrowRight size={12} strokeWidth={2.5} className="text-[#8a8a87] transition-transform group-hover:translate-x-0.5" />
      </motion.a>

      <motion.h1 {...enter(1)} className="mt-6 text-[clamp(40px,7vw,72px)] leading-[1.02] font-semibold tracking-[-0.035em]">
        Ship{' '}
        <RotatingWord words={words} i={i} />
        <br />
        <span className="text-[#8a8a87]">without the noise.</span>
      </motion.h1>

      <motion.p {...enter(2)} className="mt-5 max-w-[540px] text-[17px] leading-relaxed text-[#77777a]">
        {sub}
      </motion.p>

      <motion.div {...enter(3)} className="mt-8 flex flex-wrap justify-center gap-2">
        <motion.a
          whileTap={{ scale: 0.97 }}
          href="#"
          className="group flex h-11 items-center gap-1.5 rounded-full bg-[#111] px-5 text-[14px] font-medium text-white shadow-[0_8px_24px_-8px_rgba(0,0,0,.5)]"
        >
          Get Atlas free <ArrowRight size={15} className="transition-transform group-hover:translate-x-0.5" />
        </motion.a>
        <motion.a
          whileTap={{ scale: 0.97 }}
          href="#"
          className="flex h-11 items-center gap-2 rounded-full border border-[#e2e2df] bg-white px-5 text-[14px] font-medium"
        >
          <span className="grid size-5 place-items-center rounded-full bg-[#111] text-white">
            <Play size={9} fill="currentColor" />
          </span>
          Watch the 2-min demo
        </motion.a>
      </motion.div>

      {children && (
        <motion.div
          {...enter(4)}
          className="relative mt-14 grid w-full place-items-center overflow-hidden rounded-[28px] border border-[#e7e7e5] bg-[#efeeeb] px-3 py-10 sm:px-6 sm:py-14"
          style={{ backgroundImage: 'radial-gradient(rgba(0,0,0,.07) 1px, transparent 1px)', backgroundSize: '18px 18px' }}
        >
          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-[#efeeeb] to-transparent" />
          {children}
        </motion.div>
      )}
    </section>
  )
}

export default function HeroSectionDemo() {
  return (
    <div className="w-[1200px] rounded-[14px] bg-[#f4f4f3]">
      <HeroSection>
        <ReleaseIsland />
      </HeroSection>
    </div>
  )
}
