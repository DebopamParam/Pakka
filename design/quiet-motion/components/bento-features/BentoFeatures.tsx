import { useEffect, useState, type MouseEvent, type ReactNode } from 'react'
import { motion } from 'motion/react'
import { ArrowUp, Asterisk, Check } from 'lucide-react'
import { BlurSwap } from '../blur-swap/BlurSwap'
import { DotMatrix } from '../dot-matrix/DotMatrix'
import { NumberTicker } from '../number-ticker/NumberTicker'
import { AvatarStack, people } from '../avatar-stack/AvatarStack'
import { Reveal } from '../reveal/Reveal'

function useCycle(length: number, ms: number) {
  const [i, setI] = useState(0)
  useEffect(() => {
    const t = setInterval(() => setI((n) => (n + 1) % length), ms)
    return () => clearInterval(t)
  }, [length, ms])
  return i
}

const steps = ['Building', 'Signing', 'Notarizing', 'Uploading', 'Live']

function MiniIsland() {
  const i = useCycle(steps.length, 1300)
  const live = i === steps.length - 1
  return (
    <div className="relative flex h-10 w-[300px] items-center gap-2 overflow-hidden rounded-full bg-[#111] pr-3 pl-1.5 text-[13px] font-medium text-white shadow-[0_12px_32px_-10px_rgba(0,0,0,.5)]">
      <motion.span
        // As wide as the pill plus a 40px fade, slid in with a transform so it never triggers layout.
        className="absolute inset-y-0 left-0 w-[340px]"
        style={{ background: 'linear-gradient(90deg, var(--color-accent), var(--color-accent-2) calc(100% - 40px), transparent)' }}
        initial={false}
        animate={{ x: live ? 0 : ((i / (steps.length - 1)) - 1) * 300 }}
        transition={{ type: 'spring', stiffness: 200, damping: 30 }}
      />
      <span className="relative grid size-7 place-items-center rounded-full bg-white/20">
        {live ? <Check size={14} strokeWidth={3} /> : <ArrowUp size={14} strokeWidth={3} />}
      </span>
      <BlurSwap text={live ? 'Atlas 2.5 is live' : 'Atlas 2.5'} className="relative" />
      <BlurSwap text={steps[i]} className="relative ml-auto text-white/60" />
    </div>
  )
}

const checklist = [
  { label: 'Release notes', owner: 'Mara' },
  { label: 'QA pass', owner: 'Jon' },
  { label: 'Store listing', owner: 'Priya' },
]

function Owners() {
  const i = useCycle(people.length + 1, 1500)
  const focused = i < people.length ? people[i].id : null
  return (
    <div className="w-[220px] rounded-[14px] border border-[#e7e7e5] bg-white p-2 shadow-[0_1px_2px_rgba(0,0,0,.04),0_4px_16px_rgba(0,0,0,.05)]">
      <div className="flex items-center justify-between px-1.5 pb-1.5 text-[12px] font-medium">
        Launch week <AvatarStack focused={focused} />
      </div>
      {checklist.map((c) => (
        <motion.div
          key={c.label}
          animate={{ opacity: focused && focused !== c.owner ? 0.3 : 1 }}
          className="flex h-7 items-center gap-2 rounded-[8px] px-1.5 text-[12px]"
        >
          <span className="size-3 rounded-full border-[1.5px] border-black/25" /> {c.label}
        </motion.div>
      ))}
    </div>
  )
}

function Modules() {
  const values = [312, 784, 1284]
  const i = useCycle(values.length, 1400)
  return (
    <div className="text-center">
      <div className="text-[52px] font-semibold tracking-[-0.03em] text-[#111]">
        <NumberTicker value={values[i]} />
      </div>
      <div className="mt-1 font-mono text-[11px] text-[#8a8a87]">modules compiled</div>
    </div>
  )
}

const agentLines = [
  ['Collecting salary statements', 'Sorting deductions', 'Filling in the return'],
  ['Finding the bill in Gmail', 'Checking the amount, $84.20', 'Scheduling the payment'],
  ['Checking recurring charges', 'Found 3 unused', 'Drafting the cancellations'],
]

function AgentFeed() {
  const i = useCycle(3, 1600)
  return (
    <div className="w-full space-y-1">
      {agentLines.map((lines, k) => (
        <div key={k} className="flex items-center gap-2.5 rounded-[10px] px-2 py-1.5">
          <motion.span className="text-[#ff6a3d]" animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 3 + k, ease: 'linear' }}>
            <Asterisk size={14} strokeWidth={3} />
          </motion.span>
          <BlurSwap text={lines[(i + k) % lines.length]} className="text-[12px] text-white/70" />
        </div>
      ))}
    </div>
  )
}

function Sending() {
  const done = useCycle(2, 2200) === 1
  return (
    <div className="grid size-28 place-items-center rounded-[22px] bg-[#1b1b1b] shadow-[0_12px_32px_-10px_rgba(0,0,0,.5)]">
      <DotMatrix done={done} size={7} />
    </div>
  )
}

function Tile({ title, body, visual, dark, className = '', delay }: { title: string; body: string; visual: ReactNode; dark?: boolean; className?: string; delay: number }) {
  // A soft spotlight follows the pointer across the tile.
  const track = (e: MouseEvent<HTMLDivElement>) => {
    const r = e.currentTarget.getBoundingClientRect()
    e.currentTarget.style.setProperty('--x', `${e.clientX - r.left}px`)
    e.currentTarget.style.setProperty('--y', `${e.clientY - r.top}px`)
  }
  return (
    <Reveal delay={delay} className={className}>
      <motion.div
        onMouseMove={track}
        whileHover={{ y: -3 }}
        transition={{ type: 'spring', stiffness: 380, damping: 32 }}
        className={`group relative h-full overflow-hidden rounded-[24px] border p-2 ${
          dark ? 'border-[#2e2e2e] bg-[#1b1b1b] text-white' : 'border-[#e7e7e5] bg-white text-[#111] shadow-[0_1px_2px_rgba(0,0,0,.04),0_4px_16px_rgba(0,0,0,.05)]'
        }`}
      >
        <div
          className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100"
          style={{ background: `radial-gradient(260px circle at var(--x) var(--y), ${dark ? 'rgba(255,255,255,.06)' : 'color-mix(in srgb, var(--color-accent) 9%, transparent)'}, transparent 70%)` }}
        />
        <div className={`relative grid h-44 place-items-center rounded-[18px] px-4 ${dark ? 'bg-white/[.03]' : 'bg-[#f7f7f6]'}`}>{visual}</div>
        <div className="relative px-3 pt-4 pb-3">
          <div className="text-[15px] font-semibold tracking-[-0.01em]">{title}</div>
          <p className={`mt-1 text-[13.5px] leading-snug ${dark ? 'text-white/55' : 'text-[#77777a]'}`}>{body}</p>
        </div>
      </motion.div>
    </Reveal>
  )
}

/** A bento grid of features where every tile shows the feature working, not an icon of it. */
export function BentoFeatures() {
  return (
    <section className="mx-auto max-w-[1120px] px-6 text-[#111]">
      <Reveal className="mx-auto max-w-[620px] text-center">
        <h2 className="text-[clamp(30px,4.5vw,40px)] leading-[1.08] font-semibold tracking-[-0.03em]">Everything happens where you're already looking.</h2>
        <p className="mt-3 text-[17px] text-[#77777a]">Status lives in the UI you have open. No tab to check, no channel to scroll.</p>
      </Reveal>
      <div className="mt-12 grid grid-cols-1 gap-4 md:grid-cols-6">
        <Tile className="md:col-span-4" delay={0} title="Every step, right in the pill" body="Build, sign, notarize, upload: progress runs through the header island and gets out of the way when it's done." visual={<MiniIsland />} />
        <Tile className="md:col-span-2" delay={0.06} title="Ships in one tap" body="Drop it and go. A tiny loader tells you when it landed." visual={<Sending />} />
        <Tile className="md:col-span-2" delay={0.12} title="Know who's on it" body="Hover a face to see their work and nothing else." visual={<Owners />} />
        <Tile className="md:col-span-2" delay={0.18} title="Fast, and it shows" body="Counters roll as work lands, so speed is something you can see." visual={<Modules />} />
        <Tile className="md:col-span-2" delay={0.24} dark title="Agents report as they work" body="Every agent narrates its step in one quiet line." visual={<AgentFeed />} />
      </div>
    </section>
  )
}

export default function BentoFeaturesDemo() {
  return (
    <div className="w-[1180px] rounded-[14px] bg-[#f4f4f3] py-14">
      <BentoFeatures />
    </div>
  )
}
