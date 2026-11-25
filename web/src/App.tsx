import { CircleAlert, PackageCheck, Plus, RotateCcw, Zap } from 'lucide-react'
import { motion, useReducedMotion } from 'motion/react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { api, errorText, mockMode } from './api'
import { BuyerPhone } from './components/BuyerPhone'
import { BlurSwap } from './components/MotionText'
import { CourierHealth, Orders, Routing, Timeline } from './components/OpsPanels'
import type { OpsEvent, OpsState, Reply } from './model'

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

export function App() {
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

  const orders = state ? [...state.orders].sort((a, b) => b.created_at.localeCompare(a.created_at)) : []
  const order = orders.find((item) => item.id === selectedId)
    ?? orders.find((item) => item.status === 'awaiting_confirm')
    ?? orders[0]
  const defaultId = order?.id
  useEffect(() => {
    if (defaultId) setSelectedId((previous) => previous ?? defaultId)
  }, [defaultId])

  const jammed = state?.couriers.some((courier) => courier.id === 'swiftship' && courier.status === 'jammed') ?? false
  const faultOn = faultRequested ?? jammed
  const routing = state?.routing
  const rerouted = routing?.by_prefix['56'] === 'dakexpress' && routing.by_prefix['58'] === 'dakexpress'
  const incident = jammed ? (rerouted ? 'TRAFFIC REROUTED' : 'HUB JAMMED')
    : faultRequested && !rerouted ? 'JAM REQUESTED'
      : rerouted ? 'FALLBACK ACTIVE' : state ? 'ALL CLEAR' : 'AWAITING STATE'

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

  return (
    <>
      <header className="page-header">
        <nav className="island" aria-label="Pakka">
          <div className="nav-brand"><span className="brand-mark"><PackageCheck size={19} strokeWidth={1.9} /></span><strong>Pakka</strong></div>
          <p>Festive COD, delivered pakka.</p>
          <div className={`incident-pill mono ${jammed && !rerouted ? 'incident-active' : ''}`} role="status">
            <span className="state-dot" /><BlurSwap text={incident} />
          </div>
        </nav>
      </header>

      <main className="dashboard">
        <section className="ops" aria-labelledby="ops-heading">
          <div className="ops-heading-row">
            <h1 id="ops-heading">Brand ops<span>Jaipur Kurta Co.</span></h1>
            <motion.button className="new-order" type="button" whileTap={press} whileHover={hover} transition={spring}
              disabled={creating} onClick={() => void createOrder()}>
              <Plus size={17} strokeWidth={2.4} /><BlurSwap text={creating ? 'Creating…' : 'New order'} />
            </motion.button>
          </div>

          {connectionError && <p className="page-error" role="status"><CircleAlert size={15} /> Control tower unavailable. {connectionError}</p>}
          {orderError && <p className="page-error" role="alert"><CircleAlert size={15} /> {orderError}</p>}

          <CourierHealth couriers={state?.couriers ?? []} />
          <Orders orders={orders} selectedId={order?.id} onSelect={setSelectedId} reasons={reasons} simulated={state?.simulated ?? mockMode} />
          <div className="ops-bottom">
            <Routing routing={routing} changed={rerouted} />
            <Timeline events={events} connected={connected} />
          </div>

          <div className="fault-box">
            <div className="fault-label"><span className="fault-icon"><Zap size={15} /></span><div><strong>Fault</strong><p>SwiftShip · Bengaluru hub</p></div></div>
            <motion.button className="fault-button" type="button" whileTap={press} whileHover={hover} transition={spring}
              disabled={faultPending} onClick={() => void changeFault()}>
              {faultOn ? <RotateCcw size={14} /> : <Zap size={14} />}
              <BlurSwap text={faultPending ? 'Sending…' : faultOn ? 'Recover' : 'Jam Bengaluru hub'} />
            </motion.button>
          </div>
          {faultError && <p className="page-error" role="alert"><CircleAlert size={15} /> {faultError}</p>}
        </section>

        <BuyerPhone order={order} onReply={onReply} reply={order && replies[order.id]} />
      </main>
    </>
  )
}
