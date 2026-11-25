import { ArrowUpRight, PhoneCall, Route, ShoppingCart, Volume2 } from 'lucide-react'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { useEffect, useLayoutEffect, useState } from 'react'
import { rupees } from '../model'
import type { ReplayRun, ReplayStepId } from '../replay'
import type { useReplay } from '../useReplay'

type Proof = { sponsor: string; title: string; src?: string; text?: string }
type Beat = {
  at: number
  actor: string
  text: string
  gloss?: string
  hinglish?: boolean
  target?: string
  label?: string
  proof?: Proof
}

const spring = { type: 'spring', stiffness: 170, damping: 22 } as const

function clipLine(text: string, from: string) {
  const sentences = text.split(/(?<=[.?!])\s+/)
  return sentences.find((sentence) => sentence.includes(from)) ?? text
}

function script(run: ReplayRun): Record<ReplayStepId, Beat[]> {
  const last = run.frames[run.frames.length - 1]
  const buyer = last.state.orders.find((order) => order.id === run.orderId)
  const name = buyer?.buyer_name.split(' ')[0] ?? 'The buyer'
  const amount = buyer ? rupees.format(buyer.value) : 'the order'
  const find = (pattern: RegExp) => last.events.map((event) => pattern.exec(`${event.title} | ${event.detail}`)).find(Boolean)
  const segment = find(new RegExp(`Flagsmith evaluated ${buyer?.buyer_name ?? ''} \\| segment (\\w+)`))?.[1]
  const p95 = find(/hub jammed \| p95 (\d+) ms/)?.[1]
  const moved = find(/Rerouted \w+ → \w+ \| (\d+) in-flight/)?.[1]
  const prefixes = find(/courier_routing updated \| prefixes ([\d, ]+) now/)?.[1]
  const reply = run.reply

  return {
    start: [{ at: 0, actor: 'Pakka', text: 'Festive rush at Jaipur Kurta Co. Pakka turns the traffic into profit.' }],
    order: [
      { at: 0, actor: 'Pakka', text: `New order: ${buyer?.buyer_name ?? name}, ${buyer?.city ?? ''} — ${amount}, cash on delivery.`, target: `order-${run.orderId}`, label: 'New COD order' },
      {
        at: 7000, actor: 'Flagsmith',
        text: `Flagsmith puts ${name} in the ${segment ?? 'risky'} segment: confirm by voice before shipping.`,
        target: `order-${run.orderId}`, label: 'Flagsmith decides',
        proof: { sponsor: 'Flagsmith', title: 'COD rule per buyer segment', src: '/proof/flagsmith-segments.png' },
      },
    ],
    call: [{
      at: 0, actor: 'Sarvam AI', hinglish: true, target: 'voice-call', label: 'Sarvam calls',
      text: `“${clipLine(run.confirm.text, 'confirm')}”`,
      gloss: `Sarvam AI calls ${name} in Hinglish: “Your ${amount} Diwali order is cash on delivery — do you confirm?”`,
    }],
    reply: [
      { at: 0, actor: name, hinglish: true, text: `“${reply?.transcript ?? ''}”`, gloss: '“Yes, no problem, send it.”', target: 'reply', label: `${name} replies` },
      { at: 2000, actor: reply?.source === 'claude' ? 'Claude' : 'Pakka', text: `${reply?.source === 'claude' ? 'Claude' : 'Pakka'} reads the reply as “${reply?.intent ?? 'confirm'}”. Order ${run.orderId} is ${reply?.intent === 'cancel' ? 'cancelled' : 'confirmed'}.`, target: 'reply', label: 'Claude reads intent' },
    ],
    jam: [{ at: 0, actor: 'SwiftShip', text: `Trouble: SwiftShip's Bengaluru hub jams${p95 ? ` — p95 latency hits ${Number(p95).toLocaleString('en-IN')} ms` : ''}.`, target: 'courier-swiftship', label: 'Hub jams' }],
    crash: [
      {
        at: 0, actor: 'Kubernetes', text: 'In our Kubernetes cluster, the SwiftShip pod falls into CrashLoopBackOff.',
        target: 'courier-swiftship', label: 'Pod crashes',
        proof: run.proofs.pods_crash ? { sponsor: 'Kubernetes', title: 'kubectl get pods', text: run.proofs.pods_crash } : undefined,
      },
      {
        at: 5000, actor: 'NudgeBee', text: 'NudgeBee detects the crash loop and starts the reroute runbook.',
        target: 'courier-swiftship', label: 'NudgeBee detects',
        proof: { sponsor: 'NudgeBee', title: 'Crash loop detected in our cluster', src: '/proof/nudgebee-detected.png' },
      },
    ],
    reroute: [
      {
        at: 0, actor: 'NudgeBee', text: 'The runbook waits for a human: on-call approves it in NudgeBee.',
        target: 'routing', label: 'On-call approves',
        proof: { sponsor: 'NudgeBee', title: 'Waiting for approval', src: '/proof/nudgebee-approval.png' },
      },
      {
        at: 3500, actor: 'Flagsmith', text: `The runbook flips Flagsmith's courier_routing: pincodes ${prefixes ?? '56, 58'} → DakExpress.`,
        target: 'routing', label: 'Flagsmith reroutes',
        proof: { sponsor: 'NudgeBee', title: 'Runbook run completed', src: '/proof/nudgebee-completed.png' },
      },
      { at: 9000, actor: 'Pakka', text: `${moved ?? 'The'} in-flight orders move to DakExpress. No code deploy.`, target: 'orders', label: 'Orders moved' },
    ],
    update: [{
      at: 0, actor: 'Sarvam AI', hinglish: true, target: 'voice-update', label: `Sarvam tells ${name}`,
      text: `“${clipLine(run.update.text, 'DakExpress')}”`,
      gloss: `Sarvam AI tells ${name}: “The Bengaluru hub is delayed, so your ${amount} order now ships with DakExpress.”`,
    }],
    end: [
      { at: 0, actor: 'Pakka', text: `Fewer returns, no stuck orders: ${moved ?? 'every'} orders rerouted, ${name} kept in the loop.`, target: 'orders', label: 'Delivered pakka' },
    ],
  }
}

type Rect = { x: number; y: number; width: number; height: number }

function useTargetRect(target: string | undefined, scroll: boolean) {
  const [rect, setRect] = useState<Rect>()
  const reduce = useReducedMotion()

  useEffect(() => {
    if (!target || !scroll) return
    document.querySelector(`[data-tour="${target}"]`)?.scrollIntoView({ block: 'center', behavior: reduce ? 'auto' : 'smooth' })
  }, [target, scroll, reduce])

  useLayoutEffect(() => {
    if (!target) {
      setRect(undefined)
      return
    }
    let frame = 0
    const measure = () => {
      const box = document.querySelector(`[data-tour="${target}"]`)?.getBoundingClientRect()
      setRect((previous) => {
        if (!box) return undefined
        if (previous && previous.x === box.x && previous.y === box.y && previous.width === box.width && previous.height === box.height) return previous
        return { x: box.x, y: box.y, width: box.width, height: box.height }
      })
      frame = requestAnimationFrame(measure)
    }
    measure()
    return () => cancelAnimationFrame(frame)
  }, [target])

  return rect
}

const POINTS = [
  { icon: PhoneCall, title: 'Confirm risky COD before it ships', text: 'Flagsmith segments the buyer, Sarvam AI calls in Hinglish, Claude reads the answer.' },
  { icon: Route, title: 'Move orders off a failing courier hub', text: 'NudgeBee catches the crash, a person approves, Flagsmith reroutes. No deploy.' },
  { icon: ShoppingCart, title: 'High-value carts first at peak', text: 'Next on the roadmap.', next: true },
]

function Intro({ playing }: { playing: boolean }) {
  return (
    <motion.section className="tour-intro" aria-label="What Pakka does"
      initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10, scale: 0.98 }}
      transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}>
      <p className="tour-intro-eyebrow">Pakka · festive COD control tower</p>
      <h2>More profit from festive traffic.</h2>
      <p className="tour-intro-lede">1 in 4 cash-on-delivery parcels comes back, and jammed courier hubs stall the rest. Pakka manages the logistics for Indian D2C brands, automatically.</p>
      <ul>
        {POINTS.map(({ icon: Icon, title, text, next }) => (
          <li key={title} className={next ? 'tour-intro-next' : undefined}>
            <span className="tour-intro-icon"><Icon size={18} /></span>
            <div><strong>{title}{next && <em>Next</em>}</strong><p>{text}</p></div>
          </li>
        ))}
      </ul>
      {!playing && <p className="tour-intro-hint"><Volume2 size={14} /> Press Play the demo, with sound on</p>}
    </motion.section>
  )
}

function Presenter({ label }: { label: string }) {
  return (
    <div className="presenter-figure">
      <svg viewBox="0 0 160 160" aria-hidden="true">
        <line x1="66" y1="74" x2="150" y2="10" className="presenter-stick" />
        <circle cx="40" cy="58" r="14" />
        <path d="M40 72v42M40 114l-13 36M40 114l13 36M40 86l-19 22M40 86l28-14" />
      </svg>
      <span className="presenter-label">{label}</span>
    </div>
  )
}

export function DemoGuide({ run, playback, onProof }: {
  run: ReplayRun
  playback: ReturnType<typeof useReplay>
  onProof: (sponsor: string) => void
}) {
  const { frame, index, playing, finished } = playback
  const reduce = useReducedMotion()
  const [clock, setClock] = useState({ index, elapsed: 0 })
  const elapsed = clock.index === index ? clock.elapsed : 0
  const active = playing || finished

  useEffect(() => {
    if (!active) return
    let last = performance.now()
    const timer = window.setInterval(() => {
      const now = performance.now()
      setClock((previous) => ({ index, elapsed: (previous.index === index ? previous.elapsed : 0) + now - last }))
      last = now
    }, 200)
    return () => window.clearInterval(timer)
  }, [active, index])

  const beats = script(run)[frame.id]
  const beatIndex = Math.max(0, beats.filter((item) => item.at <= elapsed).length - 1)
  const beat = beats[beatIndex]
  const target = active ? beat.target : undefined
  const rect = useTargetRect(target, playing)
  const shown = (playing || index > 0) && beat
  const transition = reduce ? { duration: 0 } : spring
  const pad = 8
  const tip = rect && { x: rect.x + Math.min(rect.width * 0.3, 90), y: rect.y + Math.min(rect.height / 2, 34) }
  const flip = tip ? tip.x < 190 : false
  const proof = active ? beat.proof : undefined
  const proofLeft = rect && (rect.x + rect.width + 336 < window.innerWidth ? rect.x + rect.width + 16 : Math.max(16, rect.x - 336))
  const proofTop = rect && Math.min(Math.max(16, rect.y), window.innerHeight - 440)

  return (
    <>
      <AnimatePresence>
        {rect && (
          <motion.div key="spotlight" className="tour-spotlight" aria-hidden="true"
            initial={{ opacity: 0 }} exit={{ opacity: 0 }}
            animate={{ opacity: 1, left: rect.x - pad, top: rect.y - pad, width: rect.width + pad * 2, height: rect.height + pad * 2 }}
            transition={transition} />
        )}
        {tip && (
          <motion.div key="presenter" className={`tour-presenter${flip ? ' presenter-flip' : ''}`} aria-hidden="true"
            initial={{ opacity: 0, x: tip.x, y: tip.y }} exit={{ opacity: 0 }}
            animate={{ opacity: 1, x: tip.x, y: tip.y }} transition={transition}>
            <span className="presenter-ring" />
            <Presenter label={beat.label ?? beat.actor} />
          </motion.div>
        )}
        {proof && proofLeft != null && proofTop != null && (
          <motion.button key={proof.title} type="button" className="tour-proof" style={{ left: proofLeft, top: proofTop }}
            initial={reduce ? false : { opacity: 0, scale: 0.92, y: 8 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.96 }}
            transition={transition} onClick={() => onProof(proof.sponsor)}>
            <span className="tour-proof-head"><strong>{proof.sponsor}</strong>{proof.title}</span>
            {proof.src ? <img src={proof.src} alt={proof.title} /> : <pre>{proof.text}</pre>}
            <span className="tour-proof-hint">Click to enlarge</span>
          </motion.button>
        )}
      </AnimatePresence>
      <AnimatePresence>
        {index === 0 && <Intro key="intro" playing={playing} />}
      </AnimatePresence>
      <AnimatePresence mode="wait">
        {shown && (
          <motion.div key={`${frame.id}-${beatIndex}`} className="tour-caption" role="status"
            initial={reduce ? false : { opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }}
            transition={{ duration: reduce ? 0 : 0.22 }}>
            <span className={`tour-badge badge-${beat.actor.toLowerCase().replace(/[^a-z]/g, '')}`}>{beat.actor}</span>
            <div>
              <p lang={beat.hinglish ? 'hi-Latn' : undefined}>{beat.text}</p>
              {beat.gloss && <p className="tour-gloss">{beat.gloss}</p>}
              {frame.id === 'end' && (
                <a href="https://github.com/DebopamParam/Pakka" target="_blank" rel="noreferrer">github.com/DebopamParam/Pakka <ArrowUpRight size={14} /></a>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
