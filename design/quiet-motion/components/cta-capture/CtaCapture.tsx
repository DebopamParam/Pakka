import { useEffect, useRef, useState, type FormEvent } from 'react'
import { AnimatePresence, motion, useAnimate } from 'motion/react'
import { ArrowRight, Check } from 'lucide-react'
import { BlurSwap } from '../blur-swap/BlurSwap'
import { ConfettiBurst } from '../confetti-burst/ConfettiBurst'

type Phase = 'idle' | 'sending' | 'done'
const spring = { type: 'spring', stiffness: 380, damping: 32 } as const
const valid = (email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)

/** A closing call to action: the email field morphs into a spinner, then into a green "you're in" pill with a burst. */
export function CtaCapture({ demo = false }: { demo?: boolean }) {
  const [email, setEmail] = useState('')
  const [phase, setPhase] = useState<Phase>('idle')
  const [error, setError] = useState('')
  const [scope, animate] = useAnimate()
  const [burst, setBurst] = useState(0)
  const touched = useRef(false)

  function submit(e?: FormEvent) {
    e?.preventDefault()
    if (!valid(email)) {
      setError(email ? 'That email looks off' : 'Add your work email')
      animate(scope.current, { x: [0, -8, 8, -5, 5, 0] }, { duration: 0.4 })
      return
    }
    setError('')
    setPhase('sending')
  }

  useEffect(() => {
    if (phase !== 'sending') return
    const t = setTimeout(() => (setPhase('done'), setBurst((b) => b + 1)), 1400)
    return () => clearTimeout(t)
  }, [phase])

  useEffect(() => {
    if (!demo || phase !== 'idle') return
    const target = 'mara@northwind.dev'
    const timers: ReturnType<typeof setTimeout>[] = []
    let at = 900
    const later = (fn: () => void, wait: number) => timers.push(setTimeout(() => !touched.current && fn(), (at += wait)))
    for (let n = 1; n <= target.length; n++) later(() => setEmail(target.slice(0, n)), 45)
    later(() => setPhase('sending'), 600)
    return () => timers.forEach(clearTimeout)
  }, [demo, phase])

  useEffect(() => {
    if (!demo || phase !== 'done') return
    const t = setTimeout(() => !touched.current && (setPhase('idle'), setEmail('')), 3200)
    return () => clearTimeout(t)
  }, [demo, phase])

  return (
    <section className="mx-auto max-w-[1120px] px-6" onPointerEnter={() => (touched.current = true)}>
      <div
        className="relative overflow-hidden rounded-[32px] bg-[#111] px-6 py-20 text-center text-white shadow-[0_30px_80px_-30px_rgba(0,0,0,.6)]"
        style={{ backgroundImage: 'radial-gradient(60% 80% at 50% 0%, color-mix(in srgb, var(--color-accent) 22%, transparent), transparent 70%)' }}
      >
        <h2 className="text-[clamp(30px,5vw,48px)] leading-[1.05] font-semibold tracking-[-0.035em]">
          Ship your next release
          <br />
          <span className="text-white/45">quietly.</span>
        </h2>
        <p className="mx-auto mt-4 max-w-[420px] text-[16px] text-white/55">Join 4,000 teams on the early-access list. We'll send one email when your seat is ready.</p>

        <div ref={scope} className="relative mt-9 flex h-12 justify-center">
          <ConfettiBurst fire={burst} count={22} spread={90} />
          <AnimatePresence mode="popLayout" initial={false}>
            {phase === 'idle' && (
              <motion.form
                key="form"
                layoutId="cta"
                onSubmit={submit}
                noValidate
                style={{ borderRadius: 999 }}
                transition={spring}
                className="flex h-12 w-full max-w-[440px] items-center bg-white/[.08] p-1 shadow-[inset_0_0_0_1px_rgba(255,255,255,.1)]"
              >
                <input
                  value={email}
                  onChange={(e) => (setEmail(e.target.value), setError(''))}
                  type="email"
                  placeholder="you@company.com"
                  aria-label="Work email"
                  className="h-full min-w-0 flex-1 bg-transparent px-4 text-[14.5px] text-white outline-none placeholder:text-white/35"
                />
                <motion.button
                  whileTap={{ scale: 0.96 }}
                  className="group flex h-full shrink-0 cursor-pointer items-center gap-1.5 rounded-full bg-accent px-4 text-[13.5px] font-medium text-white"
                >
                  Get early access <ArrowRight size={14} className="transition-transform group-hover:translate-x-0.5" />
                </motion.button>
              </motion.form>
            )}
            {phase === 'sending' && (
              <motion.div
                key="sending"
                layoutId="cta"
                style={{ borderRadius: 999 }}
                transition={spring}
                className="grid size-12 place-items-center bg-accent"
              >
                <motion.span
                  className="size-5 rounded-full border-2 border-white/30 border-t-white"
                  animate={{ rotate: 360 }}
                  transition={{ repeat: Infinity, duration: 0.8, ease: 'linear' }}
                />
              </motion.div>
            )}
            {phase === 'done' && (
              <motion.div
                key="done"
                layoutId="cta"
                style={{ borderRadius: 999 }}
                transition={spring}
                className="flex h-12 items-center gap-2 bg-accent px-5 text-[14px] font-medium whitespace-nowrap shadow-[0_8px_30px_-6px_color-mix(in_srgb,var(--color-accent)_60%,transparent)]"
              >
                <motion.span
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: 'spring', stiffness: 600, damping: 18, delay: 0.15 }}
                  className="grid size-6 place-items-center rounded-full bg-white/25"
                >
                  <Check size={13} strokeWidth={3} />
                </motion.span>
                You're on the list. See you soon.
              </motion.div>
            )}
          </AnimatePresence>
        </div>
        <div className="mt-3 h-5 text-[12.5px] text-[#ff8a7a]">{error && <BlurSwap text={error} />}</div>
      </div>
    </section>
  )
}

export default function CtaCaptureDemo() {
  return (
    <div className="w-[1100px] rounded-[14px] bg-[#f4f4f3] py-10">
      <CtaCapture demo />
    </div>
  )
}
