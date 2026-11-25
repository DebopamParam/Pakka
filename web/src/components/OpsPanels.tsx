import { Activity, Asterisk, CircleAlert, CircleCheck, CircleDot, CircleX, GitFork, Package, Radio, Truck } from 'lucide-react'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { courierNames, rupees, statusLabels, time } from '../model'
import type { Courier, OpsEvent, OpsState, Order } from '../model'
import { BlurSwap, NumberTicker } from './MotionText'

const actorNames: Record<OpsEvent['actor'], string> = {
  pakka: 'Pakka',
  flagsmith: 'Flagsmith',
  nudgebee: 'NudgeBee',
  sarvam: 'Sarvam',
  buyer: 'Buyer',
  courier: 'Courier',
}

const statusIcons = {
  placed: CircleDot,
  awaiting_confirm: CircleDot,
  confirmed: CircleCheck,
  cancelled: CircleX,
  in_transit: CircleDot,
  rerouted: GitFork,
  delivered: CircleCheck,
}

const latency = new Intl.NumberFormat('en-IN')
const rate = new Intl.NumberFormat('en-IN', { style: 'percent', maximumFractionDigits: 1 })

export function StatusChip({ status }: { status: Order['status'] }) {
  const Icon = statusIcons[status]
  return (
    <span className={`status-chip status-${status}`}>
      <Icon size={12} />
      <BlurSwap text={statusLabels[status]} />
    </span>
  )
}

function HealthCard({ courier }: { courier: Courier }) {
  const jammed = courier.status === 'jammed'
  const StatusIcon = jammed ? CircleAlert : CircleCheck
  return (
    <article className="courier-card dark-panel" data-tour={`courier-${courier.id}`}>
      <div className="courier-top">
        <div className="courier-title">
          <span className="icon-tile"><Truck size={17} strokeWidth={1.7} /></span>
          <div>
            <h3>{courierNames[courier.id] ?? courier.name}</h3>
            <p>{courier.hub === 'Bengaluru' ? 'Bengaluru hub' : courier.hub}</p>
          </div>
        </div>
        <span className={`health-chip ${jammed ? 'health-jammed' : ''}`}>
          <StatusIcon size={12} />
          <BlurSwap text={jammed ? 'Jammed' : 'Healthy'} />
        </span>
      </div>
      <div className={`courier-stats${courier.in_flight != null ? ' with-flight' : ''}`}>
        <div>
          <p>p95 latency</p>
          <strong><NumberTicker text={courier.p95_ms == null ? '—' : latency.format(courier.p95_ms)} />{courier.p95_ms != null && <small> ms</small>}</strong>
        </div>
        <div>
          <p>Error rate</p>
          <strong><NumberTicker text={courier.error_rate == null ? '—' : rate.format(courier.error_rate)} /></strong>
        </div>
        {courier.in_flight != null && <div>
          <p>In flight</p>
          <strong><NumberTicker text={String(courier.in_flight)} /></strong>
        </div>}
        <span className="sim-label">simulated</span>
      </div>
    </article>
  )
}

export function CourierHealth({ couriers, recorded = false }: { couriers: Courier[]; recorded?: boolean }) {
  return (
    <section aria-labelledby="courier-heading" className="courier-section" data-tour="couriers">
      <div className="section-line">
        <h2 id="courier-heading"><Activity size={17} /> Courier health</h2>
        <span className="section-note mono">{recorded ? 'Recorded telemetry' : '2s polling'}</span>
      </div>
      {couriers.length > 0
        ? <div className="courier-grid">{couriers.map((courier) => <HealthCard key={courier.id} courier={courier} />)}</div>
        : <div className="dark-panel panel-placeholder">Waiting for courier telemetry…</div>}
    </section>
  )
}

export function Orders({ orders, selectedId, onSelect, reasons, simulated }: {
  orders: Order[]
  selectedId: string | undefined
  onSelect: (id: string) => void
  reasons: Record<string, string>
  simulated: boolean
}) {
  return (
    <section className="light-panel orders-panel" aria-labelledby="orders-heading" data-tour="orders">
      <div className="panel-heading">
        <h2 id="orders-heading"><Package size={16} /> Orders</h2>
        {simulated && <span className="light-badge">{orders.length} simulated orders</span>}
      </div>
      {orders.length > 0
        ? <div className="orders-scroll">
          <table>
            <thead>
              <tr><th scope="col">Destination</th><th scope="col">Value</th><th scope="col">Payment</th><th scope="col">Status</th><th scope="col">Courier</th><th scope="col">Decision</th></tr>
            </thead>
            <tbody>
              {orders.map((order) => {
                const reason = order.reason ?? order.decision_reason ?? order.decision?.reason ?? reasons[order.id]
                const inferredReason = order.status === 'rerouted'
                  ? 'Courier fallback'
                  : order.needs_voice_confirm ? 'Voice confirmation required' : `Prefix ${order.pincode.slice(0, 2)} routing`
                const selected = selectedId === order.id
                return (
                  <tr key={order.id} data-tour={`order-${order.id}`} className={selected ? 'selected-order' : ''} onClick={() => onSelect(order.id)}>
                    <th scope="row">
                      <button type="button" className="order-select" aria-pressed={selected} onClick={() => onSelect(order.id)}>
                        <strong>{order.city}</strong>
                        <span className="mono">{order.pincode}</span>
                      </button>
                    </th>
                    <td className="money">{rupees.format(order.value)}{order.priority && <span className="priority-tag" title="peak_priority: high-value cart at peak">Priority</span>}</td>
                    <td><span className="payment-tag">{order.cod ? 'COD' : 'Prepaid'}</span></td>
                    <td><StatusChip status={order.status} /></td>
                    <td>{courierNames[order.courier] ?? order.courier}</td>
                    <td className="decision" title={reason ?? inferredReason}>{reason ?? inferredReason}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
        : <p className="panel-placeholder">New orders will appear here.</p>}
    </section>
  )
}

export function Routing({ routing, changed }: { routing: OpsState['routing'] | undefined; changed: boolean }) {
  return (
    <section className="dark-panel routing-panel" aria-labelledby="routing-heading" data-tour="routing">
      <div className="panel-heading">
        <h2 id="routing-heading"><GitFork size={16} /> Routing rules</h2>
        <span className="dark-badge">{routing?.source === 'local-defaults' ? 'Local defaults' : 'Flagsmith'}</span>
      </div>
      {routing ? (
        <div className="routing-content mono">
          <div className="routing-key">courier_routing</div>
          <div className="routing-line">{'{ by_prefix: {'}</div>
          {Object.entries(routing.by_prefix).map(([prefix, courier]) => (
            <div className="routing-line route-entry" key={prefix}>
              <span>{'"' + prefix + '":'}</span>
              <span className={changed && (prefix === '56' || prefix === '58') ? 'changed-route' : undefined}>
                <BlurSwap text={`"${courier}"`} />,
              </span>
            </div>
          ))}
          <div className="routing-line">{'}, fallback: '}<span className="route-fallback">"{routing.fallback}"</span>{' }'}</div>
        </div>
      ) : <p className="panel-placeholder">Waiting for Flagsmith routing…</p>}
    </section>
  )
}

export function Timeline({ events, connected, recorded = false }: { events: OpsEvent[]; connected: boolean; recorded?: boolean }) {
  const reduce = useReducedMotion()
  return (
    <section className="dark-panel timeline-panel" aria-labelledby="timeline-heading" data-tour="activity">
      <div className="panel-heading">
        <h2 id="timeline-heading"><Radio size={16} /> Activity</h2>
        <span className={`dark-badge feed-indicator ${connected ? 'connected' : ''}`}>
          <span className="state-dot" /><BlurSwap text={recorded ? 'Recorded feed' : connected ? 'Live feed' : 'Connecting'} />
        </span>
      </div>
      {events.length > 0 ? (
        <ol className="timeline-list" aria-live="polite" aria-relevant="additions">
          <AnimatePresence initial={false}>
            {events.map((event) => (
              <motion.li
                key={event.id}
                initial={reduce ? false : { opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ type: 'spring', stiffness: 380, damping: 32 }}
              >
                <time className="event-time mono" dateTime={event.at}>
                  {Number.isNaN(Date.parse(event.at)) ? '—' : time.format(new Date(event.at))}
                </time>
                <div className="event-body">
                  <div className="event-first-line">
                    <span className={`actor actor-${event.actor}`}>{event.actor === 'nudgebee' && <Asterisk size={12} />}{actorNames[event.actor]}</span>
                    <strong>{event.title}</strong>
                  </div>
                  <p>{event.detail}</p>
                </div>
              </motion.li>
            ))}
          </AnimatePresence>
        </ol>
      ) : <p className="panel-placeholder">Events will appear as the demo runs.</p>}
    </section>
  )
}
