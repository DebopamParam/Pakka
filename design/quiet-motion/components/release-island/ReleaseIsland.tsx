import { useEffect, useState } from 'react'
import { AnimatePresence, motion, useAnimationFrame, useMotionTemplate, useMotionValue, useMotionValueEvent, useTransform, type MotionValue } from 'motion/react'
import { ArrowUp, Check } from 'lucide-react'
import { BlurSwap } from '../blur-swap/BlurSwap'
import { ConfettiBurst } from '../confetti-burst/ConfettiBurst'

type Step = { name: string; verb: string; until: number; line: string; counter: (t: number, tick: number) => string }

const steps: Step[] = [
  { name: 'Build', verb: 'Building', until: 0.3, line: 'compiling modules', counter: (t) => `${Math.round(t * 1284).toLocaleString()} / 1,284` },
  { name: 'Sign', verb: 'Signing', until: 0.45, line: 'signing with developer id', counter: (t) => `${Math.max(1, Math.ceil(t * 3))} / 3` },
  { name: 'Notarize', verb: 'Notarizing', until: 0.65, line: 'waiting on notary service', counter: (t) => `${(t * 8).toFixed(1)}s` },
  { name: 'Upload', verb: 'Uploading', until: 1, line: 'uploading atlas.zip', counter: (_, tick) => `${70 + ((tick * 7919) % 13)} MB/s` },
]
const DURATION = 12_000

const stepAt = (p: number) => Math.max(0, steps.findIndex((s) => p < s.until))
const stepProgress = (p: number, i: number) => {
  const from = i === 0 ? 0 : steps[i - 1].until
  return Math.min(1, Math.max(0, (p - from) / (steps[i].until - from)))
}

function Spinner({ done }: { done: boolean }) {
  return (
    <motion.svg
      width="14"
      height="14"
      viewBox="0 0 14 14"
      animate={{ rotate: done ? 0 : 360 }}
      transition={done ? { duration: 0.3 } : { repeat: Infinity, duration: 0.9, ease: 'linear' }}
    >
      <circle cx="7" cy="7" r="5.5" fill="none" stroke="white" strokeOpacity={0.25} strokeWidth="2" />
      <motion.circle
        cx="7"
        cy="7"
        r="5.5"
        fill="none"
        stroke="white"
        strokeWidth="2"
        strokeLinecap="round"
        animate={{ pathLength: done ? 1 : 0.3 }}
        transition={{ type: 'spring', stiffness: 200, damping: 26 }}
      />
    </motion.svg>
  )
}

function Typed({ text }: { text: string }) {
  const [n, setN] = useState(0)
  useEffect(() => {
    setN(0)
    const t = setInterval(() => setN((v) => (v >= text.length ? v : v + 1)), 28)
    return () => clearInterval(t)
  }, [text])
  return (
    <span className="truncate">
      {text.slice(0, n)}
      <motion.span
        className="ml-px inline-block h-[11px] w-[6px] translate-y-[2px] bg-white/70"
        animate={{ opacity: [1, 1, 0, 0] }}
        transition={{ repeat: Infinity, duration: 1, times: [0, 0.5, 0.5, 1] }}
      />
    </span>
  )
}

/** One step's bar. Scales on the compositor from the shared progress value: no re-render, no layout. */
function StepBar({ progress, k }: { progress: MotionValue<number>; k: number }) {
  const scaleX = useTransform(progress, (v) => stepProgress(v, k))
  return (
    <div className="h-[3px] overflow-hidden rounded-full bg-white/15">
      <motion.div className="h-full origin-left rounded-full bg-white" style={{ scaleX }} />
    </div>
  )
}

/** A "dynamic island" release pill: progress runs through the pill itself and a panel drops out of it. */
export function ReleaseIsland({ autoLoop = true }: { autoLoop?: boolean }) {
  const [version, setVersion] = useState(5)
  const [running, setRunning] = useState(true)
  const [open, setOpen] = useState(false)
  const [burst, setBurst] = useState(0)
  const [badge, setBadge] = useState(false)
  // Progress advances every frame as a motion value; React only re-renders when the step or done changes.
  const progress = useMotionValue(0)
  const [i, setI] = useState(0)
  const [done, setDone] = useState(false)
  const name = `Atlas 2.${version}`

  useAnimationFrame((_, delta) => {
    if (running && !done) progress.set(Math.min(1, progress.get() + delta / DURATION))
  })
  useMotionValueEvent(progress, 'change', (v) => {
    setI(stepAt(v))
    setDone(v >= 1)
  })

  // The fill is a layer as wide as the pill plus its 44px fade, slid in from the left with a transform.
  const fillX = useTransform(progress, (v) => (v - 1) * 100)
  const fillPx = useTransform(progress, (v) => (1 - v) * 44)
  const fill = useMotionTemplate`translateX(calc(${fillX}% + ${fillPx}px))`
  const percent = useTransform(progress, (v) => `${Math.round(v * 100)}%`)
  const secondsLeft = useTransform(progress, (v) => `${Math.ceil(((1 - v) * DURATION) / 1000)}s`)
  const counter = useTransform(progress, (v) => steps[stepAt(v)].counter(stepProgress(v, stepAt(v)), Math.floor((v * DURATION) / 400)))

  useEffect(() => {
    const t = setTimeout(() => setOpen(true), 500)
    return () => clearTimeout(t)
  }, [version])

  useEffect(() => {
    if (!done) return
    const close = setTimeout(() => {
      setOpen(false)
      setBurst((b) => b + 1)
      setBadge(true)
    }, 1400)
    const again = autoLoop ? setTimeout(shipNext, 5200) : undefined
    return () => {
      clearTimeout(close)
      clearTimeout(again)
    }
  }, [done, autoLoop])

  function shipNext() {
    setVersion((v) => (v >= 9 ? 5 : v + 1))
    progress.set(0)
    setBadge(false)
    setRunning(true)
  }

  const step = steps[i]

  return (
    <div className="relative w-[440px] max-w-full overflow-hidden rounded-[14px] bg-[#f7f7f6] pb-24 font-sans shadow-[0_1px_2px_rgba(0,0,0,.04),0_4px_16px_rgba(0,0,0,.05)]">
      <div className="grid h-14 grid-cols-[1fr_auto_1fr] items-center gap-3 border-b border-[#ececea] px-4">
        <div className="flex items-center gap-2 text-[13px] font-medium text-[#111]">
          <span className="size-3.5 rounded-[4px] bg-[#111]" /> Atlas
        </div>

        <div className="relative">
          <ConfettiBurst fire={burst} />
          <motion.button
            layout
            onClick={() => setOpen((o) => !o)}
            transition={{ type: 'spring', stiffness: 380, damping: 32 }}
            className="relative flex h-8 cursor-pointer items-center gap-2 overflow-hidden rounded-full bg-[#111] pr-2 pl-1 text-[13px] font-medium text-white"
            style={{ boxShadow: done ? '0 6px 24px -4px color-mix(in srgb, var(--color-accent) 55%, transparent)' : '0 6px 18px -6px rgba(0,0,0,.4)' }}
          >
            <motion.span
              className="absolute inset-y-0 left-0 w-[calc(100%+44px)]"
              style={{ transform: fill, background: 'linear-gradient(90deg, var(--color-accent), var(--color-accent-2) calc(100% - 44px), transparent)' }}
            />
            <span className="relative grid size-6 place-items-center rounded-full bg-white/20">
              <AnimatePresence mode="popLayout" initial={false}>
                <motion.span
                  key={done ? 'check' : 'up'}
                  initial={{ scale: 0.4, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.4, opacity: 0 }}
                  transition={{ type: 'spring', stiffness: 600, damping: 18 }}
                >
                  {done ? <Check size={13} strokeWidth={3} /> : <ArrowUp size={13} strokeWidth={3} />}
                </motion.span>
              </AnimatePresence>
            </span>
            <BlurSwap text={done ? `${name} is live` : name} className="relative" />
            <BlurSwap text={done ? 'Live' : step.verb} className="relative ml-3 text-white/60" />
            <span className="relative">
              <Spinner done={done} />
            </span>
          </motion.button>
        </div>

        <div className="relative justify-self-end">
          <button className="h-7 rounded-full border border-[#e7e7e5] bg-white px-3 text-[12px] font-medium text-[#111]">
            Share
          </button>
          <AnimatePresence>
            {badge && (
              <motion.span
                className="absolute -top-1.5 -right-1 grid size-4 place-items-center rounded-full bg-accent text-[9px] font-semibold text-white ring-2 ring-[#f7f7f6]"
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                exit={{ scale: 0 }}
                transition={{ type: 'spring', stiffness: 600, damping: 18, delay: 0.25 }}
              >
                1
              </motion.span>
            )}
          </AnimatePresence>
        </div>
      </div>

      <div className="space-y-3 px-4 pt-4">
        {[70, 52, 64, 40, 58, 46, 30].map((w, r) => (
          <div key={r} className="flex gap-4">
            <span className="h-2 rounded-full bg-[#e9e9e7]" style={{ width: `${w}%` }} />
            <span className="h-2 w-[12%] rounded-full bg-[#ececea]" />
            <span className="h-2 flex-1 rounded-full bg-[#ececea]" />
          </div>
        ))}
      </div>

      <AnimatePresence>
        {open && (
          <motion.div
            key="panel"
            className="absolute inset-x-0 top-[60px] mx-auto w-[300px] origin-top rounded-[18px] bg-[#1b1b1b] p-3 text-white shadow-[0_12px_40px_-8px_rgba(0,0,0,.45),inset_0_0_0_1px_rgba(255,255,255,.06)]"
            // Starts as a pill-sized blob over the pill itself, then pours down into the panel.
            initial={{ y: -46, clipPath: 'inset(0px 30px calc(100% - 32px) 30px round 16px)' }}
            animate={{ y: 0, clipPath: 'inset(0px 0px 0px 0px round 18px)' }}
            exit={{ y: -46, clipPath: 'inset(0px 30px calc(100% - 32px) 30px round 16px)', opacity: 0 }}
            transition={{ type: 'spring', stiffness: 260, damping: 28 }}
          >
            <motion.div
              initial={{ opacity: 0, filter: 'blur(6px)' }}
              animate={{ opacity: 1, filter: 'blur(0px)', transition: { delay: 0.12, duration: 0.25 } }}
              exit={{ opacity: 0, filter: 'blur(6px)', transition: { duration: 0.12 } }}
            >
              <div className="grid grid-cols-4 gap-1">
                {steps.map((s, k) => {
                  const finished = done || k < i
                  return (
                    <div key={s.name}>
                      <StepBar progress={progress} k={k} />
                      <div
                        className={`mt-1.5 flex items-center justify-center gap-1 text-[11px] transition-colors ${finished ? 'text-white/80' : k === i ? 'text-white' : 'text-white/35'}`}
                      >
                        <AnimatePresence initial={false}>
                          {finished && (
                            <motion.span initial={{ width: 0, opacity: 0 }} animate={{ width: 'auto', opacity: 1 }}>
                              <Check size={10} strokeWidth={3} />
                            </motion.span>
                          )}
                        </AnimatePresence>
                        {s.name}
                      </div>
                    </div>
                  )
                })}
              </div>

              <div className="mt-3 flex items-center gap-1.5 rounded-[9px] bg-[#262626] px-2.5 py-1.5 font-mono text-[11px] text-white/55">
                <span className="text-white/35">›</span>
                <Typed text={done ? 'release published' : step.line} />
                {!done && <motion.span className="ml-auto shrink-0 text-white/85 tabular-nums">{counter}</motion.span>}
              </div>

              <div className="mt-2.5 flex items-center justify-between text-[12px]">
                <span className="text-white/55">
                  {done ? (
                    <>
                      Shipped <b className="font-medium text-white">just now</b>
                    </>
                  ) : (
                    <>
                      About <motion.b className="font-medium text-white tabular-nums">{secondsLeft}</motion.b> left
                    </>
                  )}
                </span>
                <motion.span className="font-medium tabular-nums">{percent}</motion.span>
              </div>

              <div className="mt-3 grid grid-cols-2 gap-2 text-[12px] font-medium">
                <motion.button whileTap={{ scale: 0.97 }} className="h-8 cursor-pointer rounded-[9px] bg-white text-[#111]">
                  <BlurSwap text={done ? 'Open release' : 'View build'} />
                </motion.button>
                <motion.button
                  whileTap={{ scale: 0.97 }}
                  onClick={() => (done ? shipNext() : setRunning((r) => !r))}
                  className="h-8 cursor-pointer rounded-[9px] bg-[#2c2c2c] text-white"
                >
                  <BlurSwap text={done ? `Ship 2.${version >= 9 ? 5 : version + 1}` : running ? 'Pause' : 'Resume'} />
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export default function ReleaseIslandDemo() {
  return <ReleaseIsland />
}
