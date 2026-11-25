import { CircleAlert, PackageCheck, Plus, RotateCcw, Zap } from 'lucide-react'
import { motion, useReducedMotion } from 'motion/react'
import { useCallback, useEffect, useRef, useState } from 'react'
import type { ComponentProps, ReactNode } from 'react'
import { api, errorText, mockMode } from './api'
import { BuyerPhone } from './components/BuyerPhone'
import { BlurSwap } from './components/MotionText'
import { CourierHealth, Orders, Routing, Timeline } from './components/OpsPanels'
import { DemoGuide } from './components/DemoGuide'
import { ReplayControls, ReplayProof } from './components/ReplayControls'
import { sortOrders } from './model'
import type { OpsEvent, OpsState, Order, Reply } from './model'
import { demoVideo, replay, replayMode } from './replay'
import type { ProofImage, ReplayRun } from './replay'
import { useReplay } from './useReplay'

function useOps() {
  const [state, setState] = useState<OpsState>()
  const [events, setEvents] = useState<OpsEvent[]>([])
  const [connected, setConnected] = useState(false)
  const [connectionError, setConnectionError] = useState('')
  const requestId = useRef(0)
  const polling = useRef(false)

  const refresh = useCallback(async () => {
    const id = ++requestId.current
    try {
      const result = await api.state()
      if (id === requestId.current) {
        setState(result)
        setConnectionError('')
      }
    } catch (error) {
      if (id === requestId.current) setConnectionError(errorText(error))
    }
  }, [])

  useEffect(() => {
    const tick = () => {
      if (polling.current) return
      polling.current = true
      void refresh().finally(() => { polling.current = false })
    }
    tick()
    const timer = window.setInterval(tick, 2000)
    return () => window.clearInterval(timer)
  }, [refresh])

  useEffect(() => api.events(
    (event) => setEvents((existing) => existing.some((item) => item.id === event.id) ? existing : [event, ...existing].slice(0, 100)),
    setConnected,
  ), [])

  return { state, events, connected, connectionError, refresh }
}

function LiveApp() {
  const { state, events, connected, connectionError, refresh } = useOps()
  const reduce = useReducedMotion()
  const [selectedId, setSelectedId] = useState<string>()
  const [reasons, setReasons] = useState<Record<string, string>>({})
  const [replies, setReplies] = useState<Record<string, Reply>>({})
  const [faultRequested, setFaultRequested] = useState<boolean>()
  const [creating, setCreating] = useState(false)
  const [faultPending, setFaultPending] = useState(false)
  const [orderError, setOrderError] = useState('')
  const [faultError, setFaultError] = useState('')

  const orders = state ? sortOrders(state.orders) : []
  const order = orders.find((item) => item.id === selectedId)
    ?? orders.find((item) => !item.background && item.status === 'awaiting_confirm')
    ?? orders[0]
  const defaultId = order?.id
  useEffect(() => {
    if (defaultId) setSelectedId((previous) => previous ?? defaultId)
  }, [defaultId])

  const faultOn = faultRequested ?? isJammed(state)

  const onReply = useCallback((id: string, reply: Reply) => {
    setReplies((previous) => ({ ...previous, [id]: reply }))
    void refresh()
  }, [refresh])

  async function createOrder() {
    setOrderError('')
    setCreating(true)
    try {
      const response = await api.createOrder()
      setReasons((previous) => ({ ...previous, [response.order.id]: response.decision.reason }))
      setSelectedId(response.order.id)
      await refresh()
    } catch (error) {
      setOrderError(errorText(error))
    } finally {
      setCreating(false)
    }
  }

  async function changeFault() {
    const on = !faultOn
    setFaultPending(true)
    setFaultError('')
    try {
      await api.jam(on)
      setFaultRequested(on)
      await refresh()
    } catch (error) {
      setFaultError(errorText(error))
    } finally {
      setFaultPending(false)
    }
  }

  const press = reduce ? undefined : { scale: 0.97 }
  const hover = reduce ? undefined : { y: -2 }
  const spring = { type: 'spring', stiffness: 520, damping: 34 } satisfies import('motion/react').Transition

  return <Dashboard
    state={state}
    events={events}
    connected={connected}
    order={order}
    onSelect={setSelectedId}
    reasons={reasons}
    faultRequested={faultRequested}
    experience={{ kind: 'live', onReply, reply: order && replies[order.id] }}
    orderAction={
      <motion.button className="new-order" type="button" whileTap={press} whileHover={hover} transition={spring}
        disabled={creating} onClick={() => void createOrder()}>
        <Plus size={17} strokeWidth={2.4} /><BlurSwap text={creating ? 'Creating…' : 'New order'} />
      </motion.button>
    }
    errors={<>
      {connectionError && <p className="page-error" role="status"><CircleAlert size={15} /> Control tower unavailable. {connectionError}</p>}
      {orderError && <p className="page-error" role="alert"><CircleAlert size={15} /> {orderError}</p>}
    </>}
    faultAction={<>
      <div className="fault-box">
        <div className="fault-label"><span className="fault-icon"><Zap size={15} /></span><div><strong>Fault</strong><p>SwiftShip · Bengaluru hub</p></div></div>
        <motion.button className="fault-button" type="button" whileTap={press} whileHover={hover} transition={spring}
          disabled={faultPending} onClick={() => void changeFault()}>
          {faultOn ? <RotateCcw size={14} /> : <Zap size={14} />}
          <BlurSwap text={faultPending ? 'Sending…' : faultOn ? 'Recover' : 'Jam Bengaluru hub'} />
        </motion.button>
      </div>
      {faultError && <p className="page-error" role="alert"><CircleAlert size={15} /> {faultError}</p>}
    </>}
  />
}

function isJammed(state: OpsState | undefined) {
  return state?.couriers.some((courier) => courier.id === 'swiftship' && courier.status === 'jammed') ?? false
}

function Dashboard({
  state, events, order, onSelect, experience, connected = false, reasons = {},
  faultRequested, orderAction, errors, faultAction, toolbar, guide, faultStarted = false,
}: {
  state?: OpsState
  events: OpsEvent[]
  order?: Order
  onSelect: (id: string) => void
  experience: ComponentProps<typeof BuyerPhone>['experience']
  connected?: boolean
  reasons?: Record<string, string>
  faultRequested?: boolean
  orderAction?: ReactNode
  errors?: ReactNode
  faultAction?: ReactNode
  toolbar?: ReactNode
  guide?: ReactNode
  faultStarted?: boolean
}) {
  const recorded = experience.kind === 'replay'
  const jammed = isJammed(state)
  const routing = state?.routing
  const rerouted = routing?.by_prefix['56'] === 'dakexpress' && routing.by_prefix['58'] === 'dakexpress'
  const incident = jammed ? (rerouted ? 'TRAFFIC REROUTED' : 'HUB JAMMED')
    : faultStarted ? 'FAULT INJECTED'
      : faultRequested && !rerouted ? 'JAM REQUESTED'
        : rerouted ? 'FALLBACK ACTIVE' : state ? 'ALL CLEAR' : 'AWAITING STATE'
  const orders = state ? sortOrders(state.orders) : []

  return (
    <>
      <header className="page-header">
        <nav className="island" aria-label="Pakka">
          <div className="nav-brand"><span className="brand-mark"><PackageCheck size={19} strokeWidth={1.9} /></span><strong>Pakka</strong></div>
          <p>Smart festive logistics, less waste.</p>
          <div className={`incident-pill mono ${(jammed || faultStarted) && !rerouted ? 'incident-active' : ''}`} role="status">
            <span className="state-dot" /><BlurSwap text={incident} />
          </div>
        </nav>
      </header>

      {toolbar}
      <main className={`dashboard${recorded ? ' dashboard-replay' : ''}`}>
        <section className="ops" aria-labelledby="ops-heading">
          <div className="ops-heading-row">
            <h1 id="ops-heading">Brand ops<span>Jaipur Kurta Co.</span></h1>
            {orderAction}
          </div>
          {errors}
          <CourierHealth couriers={state?.couriers ?? []} recorded={recorded} />
          <Orders orders={orders} selectedId={order?.id} onSelect={onSelect} reasons={reasons} simulated={state?.simulated ?? (!recorded && mockMode)} />
          <div className="ops-bottom">
            <Routing routing={routing} changed={rerouted} />
            <Timeline events={events} connected={connected} recorded={recorded} />
          </div>
          {faultAction}
        </section>

        <div className="side">
          <BuyerPhone order={order} experience={experience} />
          {recorded && demoVideo && (
            <section className="demo-video" aria-label="Demo video">
              <iframe src={`https://www.youtube-nocookie.com/embed/${demoVideo}`} title="Pakka demo video"
                allow="encrypted-media; picture-in-picture; fullscreen" allowFullScreen loading="lazy" />
            </section>
          )}
        </div>
      </main>
      {guide}
    </>
  )
}

function RecordedApp({ run, images }: { run: ReplayRun; images: ProofImage[] }) {
  const playback = useReplay(run)
  const { frame, index, pause } = playback
  const [selection, setSelection] = useState<{ index: number; id: string }>()
  const [proof, setProof] = useState('')
  const openProof = (id: string) => {
    if (id) pause()
    setProof(id)
  }
  const selectedId = selection?.index === index ? selection.id : run.orderId
  const order = frame.state.orders.find((item) => item.id === selectedId)
  const reached = (id: string) => run.frames.slice(0, index + 1).some((step) => step.id === id)
  const recordedBuyer = order?.id === run.orderId

  return <Dashboard
    state={frame.state}
    events={frame.events}
    order={order}
    onSelect={(id) => setSelection({ index, id })}
    faultStarted={frame.id === 'jam'}
    experience={{
      kind: 'replay',
      prompt: recordedBuyer && reached('call') ? run.confirm : undefined,
      update: recordedBuyer && reached('update') ? run.update : undefined,
      reply: recordedBuyer && reached('reply') ? run.reply : undefined,
      pause,
      demoPlaying: playback.playing,
    }}
    toolbar={<div className="replay-toolbar">
      <ReplayControls run={run} playback={playback} />
      <ReplayProof run={run} images={images} selected={proof} onSelect={openProof} hidden={playback.playing} />
    </div>}
    guide={<DemoGuide run={run} playback={playback} onProof={openProof} />}
  />
}

type Recording = { status: 'loading' } | { status: 'loaded'; run: ReplayRun } | { status: 'failed' }

function ReplayApp() {
  const [recording, setRecording] = useState<Recording>({ status: 'loading' })
  const [images, setImages] = useState<ProofImage[]>([])
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    const request = new AbortController()
    void replay.load(request.signal).then(
      (run) => setRecording({ status: 'loaded', run }),
      () => { if (!request.signal.aborted) setRecording({ status: 'failed' }) },
    )
    void replay.proofImages(request.signal).then(setImages, () => {})
    return () => request.abort()
  }, [attempt])

  if (recording.status === 'loaded') return <RecordedApp run={recording.run} images={images} />

  return (
    <div className="replay-toolbar replay-loading" role="status">
      {recording.status === 'loading' ? <p>Loading recorded demo…</p> : <>
        <p>The recorded demo could not load.</p>
        <button type="button" className="new-order" onClick={() => {
          setRecording({ status: 'loading' })
          setAttempt((count) => count + 1)
        }}>Retry</button>
      </>}
    </div>
  )
}

export function App() {
  return replayMode ? <ReplayApp /> : <LiveApp />
}
