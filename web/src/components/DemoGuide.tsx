import { ArrowUpRight, PhoneCall, Route, ShoppingCart, UserCheck } from 'lucide-react'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { useEffect, useLayoutEffect, useState } from 'react'
import { rupees } from '../model'
import narration from '../narration.json'
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
  // The sponsor features at work in this beat.
  feature?: string
  human?: boolean
}

const spring = { type: 'spring', stiffness: 170, damping: 22 } as const

function clipLine(text: string, from: string) {
  const sentences = text.split(/(?<=[.?!])\s+/)
  return sentences.find((sentence) => sentence.includes(from)) ?? text
}

function script(run: ReplayRun): Record<ReplayStepId, Beat[]> {
  const beats = steps(run)
  // Each caption starts when the narrator starts its line.
  for (const [id, starts] of Object.entries(narration) as [ReplayStepId, number[]][]) {
    starts.forEach((at, i) => { if (beats[id][i]) beats[id][i].at = at })
  }
  return beats
}

function steps(run: ReplayRun): Record<ReplayStepId, Beat[]> {
  const last = run.frames[run.frames.length - 1]
  const buyer = last.state.orders.find((order) => order.id === run.orderId)
  const name = buyer?.buyer_name.split(' ')[0] ?? 'The buyer'
  const amount = buyer ? rupees.format(buyer.value) : 'the order'
  const find = (pattern: RegExp) => last.events.map((event) => pattern.exec(`${event.title} | ${event.detail}`)).find(Boolean)
  const segment = find(new RegExp(`Flagsmith evaluated ${buyer?.buyer_name ?? ''} \\| segment (\\w+)`))?.[1]
  const p95 = find(/hub jammed \| p95 (\d+) ms/)?.[1]
  const moved = find(/Rerouted .+? → .+? \| (\d+) in-flight/)?.[1]
  const prefixes = find(/courier_routing updated \| prefixes ([\d, ]+) now/)?.[1]
  const reply = run.reply
  const cart = last.state.orders.find((order) => order.priority && !order.background && order.courier !== 'swiftship')

  return {
    start: [{ at: 0, actor: 'Pakka', text: 'Festive rush at Jaipur Kurta Co. Pakka turns the traffic into profit, with less waste.' }],
    blocked: [{
      at: 0, actor: 'Flagsmith', text: 'A buyer with 3 past returns asks for COD: Flagsmith turns COD off and offers prepaid instead.',
      target: 'activity', label: 'No COD for repeat returners',
      feature: 'Flagsmith · segment rto_offender (past_rto ≥ 2) overrides cod_policy: cod_allowed false',
    }],
    order: [
      { at: 0, actor: 'Pakka', text: `New order: ${buyer?.buyer_name ?? name}, ${buyer?.city ?? ''} — ${amount}, cash on delivery.`, target: `order-${run.orderId}`, label: 'New COD order' },
      {
        at: 7000, actor: 'Flagsmith',
        text: `Flagsmith puts ${name} in the ${segment ?? 'risky'} segment: confirm by voice before shipping.`,
        feature: 'Flagsmith · identity traits → segment → segment override of the cod_policy flag',
        target: `order-${run.orderId}`, label: 'Flagsmith decides',
        proof: { sponsor: 'Flagsmith', title: 'COD rule per buyer segment', src: '/proof/flagsmith-segments.png' },
      },
    ],
    call: [{
      at: 0, actor: 'Sarvam AI', hinglish: true, target: 'voice-call', label: 'Sarvam calls',
      text: `“${clipLine(run.confirm.text, 'confirm')}”`,
      gloss: `Sarvam AI calls ${name} in Hinglish: “Your ${amount} Diwali order is cash on delivery — do you confirm?”`,
      feature: 'Sarvam AI · Bulbul text-to-speech in Hinglish',
    }],
    reply: [
      { at: 0, actor: name, hinglish: true, text: `“${reply?.transcript ?? ''}”`, gloss: '“Yes, no problem, send it.”', target: 'reply', label: `${name} replies` },
      { at: 2000, actor: reply?.source === 'claude' ? 'Claude' : 'Pakka', text: `${reply?.source === 'claude' ? 'Claude' : 'Pakka'} reads the reply as “${reply?.intent ?? 'confirm'}”. Order ${run.orderId} is ${reply?.intent === 'cancel' ? 'cancelled' : 'confirmed'}.`, target: 'reply', label: 'Claude reads intent', feature: 'Claude · reads the intent of the reply' },
    ],
    jam: [{ at: 0, actor: 'Courier 1', text: `Trouble: Courier 1's Bengaluru hub jams${p95 ? ` — p95 latency hits ${Number(p95).toLocaleString('en-IN')} ms` : ''}.`, target: 'courier-swiftship', label: 'Hub jams' }],
    crash: [
      {
        at: 0, actor: 'Kubernetes', text: 'In our Kubernetes cluster, the Courier 1 pod falls into CrashLoopBackOff.',
        target: 'courier-swiftship', label: 'Pod crashes',
        proof: run.proofs.pods_crash ? { sponsor: 'Kubernetes', title: 'kubectl get pods', text: run.proofs.pods_crash } : undefined,
      },
      {
        at: 5000, actor: 'NudgeBee', text: 'NudgeBee detects the crash loop and starts the reroute runbook.',
        feature: 'NudgeBee · Kubernetes event detection → automation event trigger',
        target: 'courier-swiftship', label: 'NudgeBee detects',
        proof: { sponsor: 'NudgeBee', title: 'Crash loop detected in our cluster', src: '/proof/nudgebee-detected-crop.png' },
      },
    ],
    priority: [{
      at: 0, actor: 'Flagsmith', text: `At peak, a ${cart ? rupees.format(cart.value) : 'high-value'} cart for Bengaluru skips the jammed hub and goes straight to Courier 2.`,
      target: cart ? `order-${cart.id}` : 'orders', label: 'High-value cart first',
      feature: 'Flagsmith · peak_priority remote config: carts ≥ ₹2,000 at ≥ 40 orders in flight',
    }],
    reroute: [
      {
        at: 0, actor: 'NudgeBee', human: true, text: 'Nothing changes until a person says yes: the automation stops at its approval step, and on-call approves it.',
        target: 'routing', label: 'A person approves',
        feature: 'NudgeBee · approval step · here in NudgeBee; Slack, Teams or Google Chat also work',
        proof: { sponsor: 'NudgeBee', title: 'Waiting for on-call approval', src: '/proof/nudgebee-approval-crop.png' },
      },
      {
        at: 3500, actor: 'Flagsmith', text: `NudgeBee's script calls Pakka, which rewrites courier_routing in Flagsmith: pincodes ${prefixes ?? '56, 58'} → Courier 2.`,
        target: 'routing', label: 'Flagsmith reroutes',
        feature: 'NudgeBee · run-script action → Flagsmith · Admin API updates the courier_routing remote config',
        proof: { sponsor: 'NudgeBee', title: 'Event trigger → approval → run script', src: '/proof/nudgebee-automation-crop.png' },
      },
      {
        at: 9000, actor: 'Pakka', text: `${moved ?? 'The'} in-flight orders move to Courier 2. No code deploy.`, target: 'orders', label: 'Orders moved',
        feature: 'Flagsmith · remote config, changed live',
        proof: { sponsor: 'Flagsmith', title: 'courier_routing remote config', src: '/proof/flagsmith-routing.png' },
      },
    ],
    update: [{
      at: 0, actor: 'Sarvam AI', hinglish: true, target: 'voice-update', label: `Sarvam tells ${name}`,
      text: `“${clipLine(run.update.text, 'DakExpress')}”`,
      gloss: `Sarvam AI tells ${name}: “The Bengaluru hub is delayed, so your ${amount} order now ships with Courier 2.”`,
      feature: 'Sarvam AI · Bulbul text-to-speech in Hinglish',
    }],
    end: [
      { at: 0, actor: 'Pakka', text: `Fewer returns, no stuck orders: ${moved ?? 'every'} orders rerouted, ${name} kept in the loop.`, target: 'orders', label: 'Delivered pakka', feature: 'Also in Flagsmith: voice_confirm_enabled kill switch · prepaid_nudge A/B test · peak_priority' },
      { at: 9000, actor: 'Pakka', text: 'How it connects: self-hosted Flagsmith, hosted NudgeBee, Kubernetes on OrbStack, the Claude API and Sarvam AI.' },
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
  { icon: PhoneCall, title: 'Fewer wasted returns', text: 'Flagsmith segments · Sarvam AI voice check · Claude reads reply · no COD for repeat returners' },
  { icon: ShoppingCart, title: 'High-value carts first', text: 'Flagsmith peak_priority · big carts skip the jammed hub' },
  { icon: Route, title: 'Self-healing routing', text: 'NudgeBee detects · human approves · Flagsmith reroutes live · no deploy' },
]

function Intro() {
  return (
    <motion.section className="tour-intro" aria-label="What Pakka does"
      initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10, scale: 0.98 }}
      transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}>
      <p className="tour-intro-eyebrow">Pakka · smart festive logistics</p>
      <h2>More profit from festive traffic.</h2>
      <p className="tour-intro-lede">Returned parcels · jammed hubs · big carts stuck in queue. Fixed live, for Indian D2C brands.</p>
      <ul>
        {POINTS.map(({ icon: Icon, title, text }) => (
          <li key={title}>
            <span className="tour-intro-icon"><Icon size={18} /></span>
            <div><strong>{title}</strong><p>{text}</p></div>
          </li>
        ))}
      </ul>
      <p className="tour-intro-buyer"><strong>Who buys it:</strong> COD-heavy D2C brands · shipping aggregators and 3PLs</p>
      <p className="tour-intro-stack">Flagsmith (self-hosted) · NudgeBee · Sarvam AI · Claude API · Kubernetes on OrbStack</p>
    </motion.section>
  )
}

function Outro() {
  return (
    <motion.section className="tour-intro tour-outro" aria-label="How the pieces connect"
      initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10, scale: 0.98 }}
      transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}>
      <p className="tour-intro-eyebrow">Architecture</p>
      <h2>How the pieces connect.</h2>
      <svg className="arch-svg" viewBox="0 0 880 400" role="img" aria-label="Buyer, Sarvam AI and Claude API around our MacBook, which runs self-hosted Flagsmith and a Kubernetes cluster in OrbStack; hosted NudgeBee watches the cluster and a person approves each fix">
        <defs>
          <marker id="arch-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0 0L10 5L0 10z" /></marker>
        </defs>
        <rect className="arch-zone" x="200" y="100" width="660" height="185" rx="18" />
        <text className="arch-zone-label" x="216" y="276">Our MacBook</text>
        <rect className="arch-k8s" x="400" y="132" width="440" height="135" rx="14" />
        <text className="arch-k8s-label" x="826" y="150">Kubernetes · OrbStack</text>
        <rect className="arch-cloud" x="400" y="305" width="460" height="82" rx="14" />
        <text className="arch-cloud-label" x="414" y="323">NudgeBee · hosted automation</text>

        <g className="arch-box"><rect x="20" y="20" width="150" height="56" rx="12" /><text x="95" y="44">Buyer</text><text className="arch-sub" x="95" y="62">places an order</text></g>
        <g className="arch-box"><rect x="250" y="20" width="170" height="56" rx="12" /><text x="335" y="44">Sarvam AI</text><text className="arch-sub" x="335" y="62">cloud API · voice</text></g>
        <g className="arch-box"><rect x="690" y="20" width="170" height="56" rx="12" /><text x="775" y="44">Claude API</text><text className="arch-sub" x="775" y="62">reads the reply</text></g>
        <g className="arch-box"><rect x="215" y="150" width="140" height="56" rx="12" /><text x="285" y="174">Flagsmith</text><text className="arch-sub" x="285" y="192">self-hosted · Docker</text></g>
        <g className="arch-box arch-main"><rect x="420" y="160" width="150" height="40" rx="10" /><text x="495" y="185">Pakka control tower</text></g>
        <g className="arch-box"><rect x="590" y="160" width="110" height="40" rx="10" /><text x="645" y="185">Courier 1</text></g>
        <g className="arch-box"><rect x="715" y="160" width="110" height="40" rx="10" /><text x="770" y="185">Courier 2</text></g>
        <g className="arch-box"><rect x="420" y="215" width="200" height="36" rx="10" /><text className="arch-small" x="520" y="238">run-script pod</text></g>
        <g className="arch-box"><rect x="640" y="215" width="185" height="36" rx="10" /><text className="arch-small" x="732" y="238">NudgeBee agent</text></g>
        <g className="arch-box"><rect x="420" y="333" width="130" height="36" rx="10" /><text x="485" y="356">Run script</text></g>
        <g className="arch-box arch-approve"><rect x="565" y="333" width="130" height="36" rx="10" /><text x="630" y="356">Approval</text></g>
        <g className="arch-box"><rect x="710" y="333" width="130" height="36" rx="10" /><text x="775" y="356">Event trigger</text></g>
        <g className="arch-box arch-person"><rect x="20" y="305" width="170" height="82" rx="12" /><text x="105" y="333">On-call person</text><text className="arch-sub" x="105" y="353">approves in NudgeBee,</text><text className="arch-sub" x="105" y="370">Slack, Teams or Chat</text></g>

        <g className="arch-flow">
          <path d="M95 76V120H445V160" /><text x="270" y="114">① order</text>
          <path d="M420 180H355" markerStart="url(#arch-arrow)" /><text x="285" y="224">② flags per buyer</text><text x="285" y="240">⑦ new routing</text>
          <path d="M530 160V92H335V76" /><text x="432" y="86">③ call text</text>
          <path d="M250 48H170" /><text x="210" y="40">③ Hinglish call</text>
          <path d="M555 160V104H775V76" markerStart="url(#arch-arrow)" /><text x="665" y="98">④ reply → intent</text>
          <path d="M670 200V215" /><text className="arch-note" x="676" y="211">⑤ crash loop</text>
          <path d="M760 251V333" /><text x="805" y="292">⑤ pod events</text>
          <path d="M710 351H695" /><path d="M565 351H550" />
          <path d="M190 378H630V369" /><text x="410" y="394">⑥ a person approves</text>
          <path d="M485 333V251" /><text x="540" y="292">⑦ runs in our cluster</text>
          <path d="M490 215V200" />
        </g>
      </svg>
      <div className="arch-business">
        <p><strong>Who buys it</strong> Indian D2C brands that sell a lot on cash on delivery during festive sales, and the shipping aggregators and 3PLs that run their orders.</p>
        <p><strong>Why they pay</strong> every refused COD parcel is shipping paid both ways for no sale, and a jammed hub strands orders. Pakka cuts both, as a per-order subscription that plugs into their store.</p>
      </div>
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
  const { frame, index, position, playing, finished } = playback
  const reduce = useReducedMotion()
  // Restarts from the playback position whenever it moves: a new step or a seek.
  const [clock, setClock] = useState({ position, elapsed: position.elapsed })
  const elapsed = clock.position === position ? clock.elapsed : position.elapsed
  const active = playing || finished

  useEffect(() => {
    if (!playing) return
    let last = performance.now()
    const timer = window.setInterval(() => {
      const now = performance.now()
      setClock((previous) => ({ position, elapsed: (previous.position === position ? previous.elapsed : position.elapsed) + (now - last) * playback.rate }))
      last = now
    }, 200)
    return () => window.clearInterval(timer)
  }, [playing, position, playback.rate])

  const beats = script(run)[frame.id]
  const beatIndex = Math.max(0, beats.filter((item) => item.at <= elapsed).length - 1)
  const beat = beats[beatIndex]
  // Before the demo starts, the presenter points at the Play button instead of covering the page.
  const waiting = !playing && index === 0
  const target = waiting ? 'play' : active ? beat.target : undefined
  const rect = useTargetRect(target, playing)
  const shown = (playing || index > 0) && beat
  const transition = reduce ? { duration: 0 } : spring
  const pad = 8
  const tip = rect && (waiting ? { x: rect.x + rect.width - 6, y: rect.y + rect.height - 4 } : { x: rect.x + Math.min(rect.width * 0.3, 90), y: rect.y + Math.min(rect.height / 2, 34) })
  const flip = tip ? tip.x < 190 : false
  const proof = active ? beat.proof : undefined
  const proofWidth = proof?.sponsor === 'NudgeBee' ? 720 : 320
  const proofLeft = rect && (rect.x + rect.width + proofWidth + 16 < window.innerWidth ? rect.x + rect.width + 16 : Math.max(16, rect.x - proofWidth - 16))
  // The large NudgeBee screenshots sit just below the replay controls, clear of the caption.
  const controls = document.querySelector('.replay-toolbar')?.getBoundingClientRect().bottom ?? 0
  const proofTop = rect && (proofWidth > 320 ? Math.max(16, controls + 12) : Math.min(Math.max(16, rect.y), window.innerHeight - 440))

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
            <Presenter label={waiting ? 'Press Play · sound on' : beat.label ?? beat.actor} />
          </motion.div>
        )}
        {proof && proofLeft != null && proofTop != null && (
          <motion.button key={proof.title} type="button" className={`tour-proof${proof.sponsor === 'NudgeBee' ? ' tour-proof-wide' : ''}${beat.human ? ' tour-proof-human' : ''}`} style={{ left: proofLeft, top: proofTop }}
            initial={reduce ? false : { opacity: 0, scale: 0.92, y: 8 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.96 }}
            transition={transition} onClick={() => onProof(proof.sponsor)}>
            <span className="tour-proof-head"><strong>{proof.sponsor}</strong>{proof.title}</span>
            {proof.src ? <img src={proof.src} alt={proof.title} /> : <pre>{proof.text}</pre>}
            <span className="tour-proof-hint">Click to enlarge</span>
          </motion.button>
        )}
      </AnimatePresence>
      <AnimatePresence>
        {index === 0 && playing && <Intro key="intro" />}
        {frame.id === 'end' && beatIndex === 1 && <Outro key="outro" />}
      </AnimatePresence>
      <AnimatePresence mode="wait">
        {shown && (
          <motion.div key={`${frame.id}-${beatIndex}`} className="tour-caption" role="status"
            initial={reduce ? false : { opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }}
            transition={{ duration: reduce ? 0 : 0.22 }}>
            <div className="tour-badges">
              {beat.human && <span className="tour-badge badge-human"><UserCheck size={13} /> Human in the loop</span>}
              <span className={`tour-badge badge-${beat.actor.toLowerCase().replace(/[^a-z]/g, '')}`}>{beat.actor}</span>
            </div>
            <div>
              <p lang={beat.hinglish ? 'hi-Latn' : undefined}>{beat.text}</p>
              {beat.gloss && <p className="tour-gloss">{beat.gloss}</p>}
              {beat.feature && <p className="tour-feature">{beat.feature}</p>}
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
