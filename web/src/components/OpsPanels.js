import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Activity, Asterisk, CircleAlert, CircleCheck, CircleDot, CircleX, GitFork, Package, Radio, Truck } from 'lucide-react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { courierNames, rupees, statusLabels, time } from '../model';
import { BlurSwap, NumberTicker } from './MotionText';
const actorNames = {
    pakka: 'Pakka',
    flagsmith: 'Flagsmith',
    nudgebee: 'NudgeBee',
    sarvam: 'Sarvam',
    buyer: 'Buyer',
    courier: 'Courier',
};
const statusIcons = {
    placed: CircleDot,
    awaiting_confirm: CircleDot,
    confirmed: CircleCheck,
    cancelled: CircleX,
    in_transit: CircleDot,
    rerouted: GitFork,
    delivered: CircleCheck,
};
const latency = new Intl.NumberFormat('en-IN');
const rate = new Intl.NumberFormat('en-IN', { style: 'percent', maximumFractionDigits: 1 });
export function StatusChip({ status }) {
    const Icon = statusIcons[status];
    return (_jsxs("span", { className: `status-chip status-${status}`, children: [_jsx(Icon, { size: 12 }), _jsx(BlurSwap, { text: statusLabels[status] })] }));
}
function HealthCard({ courier }) {
    const jammed = courier.status === 'jammed';
    const StatusIcon = jammed ? CircleAlert : CircleCheck;
    return (_jsxs("article", { className: "courier-card dark-panel", "data-tour": `courier-${courier.id}`, children: [_jsxs("div", { className: "courier-top", children: [_jsxs("div", { className: "courier-title", children: [_jsx("span", { className: "icon-tile", children: _jsx(Truck, { size: 17, strokeWidth: 1.7 }) }), _jsxs("div", { children: [_jsx("h3", { children: courierNames[courier.id] ?? courier.name }), _jsx("p", { children: courier.hub === 'Bengaluru' ? 'Bengaluru hub' : courier.hub })] })] }), _jsxs("span", { className: `health-chip ${jammed ? 'health-jammed' : ''}`, children: [_jsx(StatusIcon, { size: 12 }), _jsx(BlurSwap, { text: jammed ? 'Jammed' : 'Healthy' })] })] }), _jsxs("div", { className: `courier-stats${courier.in_flight != null ? ' with-flight' : ''}`, children: [_jsxs("div", { children: [_jsx("p", { children: "p95 latency" }), _jsxs("strong", { children: [_jsx(NumberTicker, { text: courier.p95_ms == null ? '—' : latency.format(courier.p95_ms) }), courier.p95_ms != null && _jsx("small", { children: " ms" })] })] }), _jsxs("div", { children: [_jsx("p", { children: "Error rate" }), _jsx("strong", { children: _jsx(NumberTicker, { text: courier.error_rate == null ? '—' : rate.format(courier.error_rate) }) })] }), courier.in_flight != null && _jsxs("div", { children: [_jsx("p", { children: "In flight" }), _jsx("strong", { children: _jsx(NumberTicker, { text: String(courier.in_flight) }) })] }), _jsx("span", { className: "sim-label", children: "simulated" })] })] }));
}
export function CourierHealth({ couriers, recorded = false }) {
    return (_jsxs("section", { "aria-labelledby": "courier-heading", className: "courier-section", "data-tour": "couriers", children: [_jsxs("div", { className: "section-line", children: [_jsxs("h2", { id: "courier-heading", children: [_jsx(Activity, { size: 17 }), " Courier health"] }), _jsx("span", { className: "section-note mono", children: recorded ? 'Recorded telemetry' : '2s polling' })] }), couriers.length > 0
                ? _jsx("div", { className: "courier-grid", children: couriers.map((courier) => _jsx(HealthCard, { courier: courier }, courier.id)) })
                : _jsx("div", { className: "dark-panel panel-placeholder", children: "Waiting for courier telemetry\u2026" })] }));
}
export function Orders({ orders, selectedId, onSelect, reasons, simulated }) {
    return (_jsxs("section", { className: "light-panel orders-panel", "aria-labelledby": "orders-heading", "data-tour": "orders", children: [_jsxs("div", { className: "panel-heading", children: [_jsxs("h2", { id: "orders-heading", children: [_jsx(Package, { size: 16 }), " Orders"] }), simulated && _jsxs("span", { className: "light-badge", children: [orders.length, " simulated orders"] })] }), orders.length > 0
                ? _jsx("div", { className: "orders-scroll", children: _jsxs("table", { children: [_jsx("thead", { children: _jsxs("tr", { children: [_jsx("th", { scope: "col", children: "Destination" }), _jsx("th", { scope: "col", children: "Value" }), _jsx("th", { scope: "col", children: "Payment" }), _jsx("th", { scope: "col", children: "Status" }), _jsx("th", { scope: "col", children: "Courier" }), _jsx("th", { scope: "col", children: "Decision" })] }) }), _jsx("tbody", { children: orders.map((order) => {
                                    const reason = order.reason ?? order.decision_reason ?? order.decision?.reason ?? reasons[order.id];
                                    const inferredReason = order.status === 'rerouted'
                                        ? 'Courier fallback'
                                        : order.needs_voice_confirm ? 'Voice confirmation required' : `Prefix ${order.pincode.slice(0, 2)} routing`;
                                    const selected = selectedId === order.id;
                                    return (_jsxs("tr", { "data-tour": `order-${order.id}`, className: selected ? 'selected-order' : '', onClick: () => onSelect(order.id), children: [_jsx("th", { scope: "row", children: _jsxs("button", { type: "button", className: "order-select", "aria-pressed": selected, onClick: () => onSelect(order.id), children: [_jsx("strong", { children: order.city }), _jsx("span", { className: "mono", children: order.pincode })] }) }), _jsxs("td", { className: "money", children: [rupees.format(order.value), order.priority && _jsx("span", { className: "priority-tag", title: "peak_priority: high-value cart at peak", children: "Priority" })] }), _jsx("td", { children: _jsx("span", { className: "payment-tag", children: order.cod ? 'COD' : 'Prepaid' }) }), _jsx("td", { children: _jsx(StatusChip, { status: order.status }) }), _jsx("td", { children: courierNames[order.courier] ?? order.courier }), _jsx("td", { className: "decision", title: reason ?? inferredReason, children: reason ?? inferredReason })] }, order.id));
                                }) })] }) })
                : _jsx("p", { className: "panel-placeholder", children: "New orders will appear here." })] }));
}
export function Routing({ routing, changed }) {
    return (_jsxs("section", { className: "dark-panel routing-panel", "aria-labelledby": "routing-heading", "data-tour": "routing", children: [_jsxs("div", { className: "panel-heading", children: [_jsxs("h2", { id: "routing-heading", children: [_jsx(GitFork, { size: 16 }), " Routing rules"] }), _jsx("span", { className: "dark-badge", children: routing?.source === 'local-defaults' ? 'Local defaults' : 'Flagsmith' })] }), routing ? (_jsxs("div", { className: "routing-content mono", children: [_jsx("div", { className: "routing-key", children: "courier_routing" }), _jsx("div", { className: "routing-line", children: '{ by_prefix: {' }), Object.entries(routing.by_prefix).map(([prefix, courier]) => (_jsxs("div", { className: "routing-line route-entry", children: [_jsx("span", { children: '"' + prefix + '":' }), _jsxs("span", { className: changed && (prefix === '56' || prefix === '58') ? 'changed-route' : undefined, children: [_jsx(BlurSwap, { text: `"${courier}"` }), ","] })] }, prefix))), _jsxs("div", { className: "routing-line", children: ['}, fallback: ', _jsxs("span", { className: "route-fallback", children: ["\"", routing.fallback, "\""] }), ' }'] })] })) : _jsx("p", { className: "panel-placeholder", children: "Waiting for Flagsmith routing\u2026" })] }));
}
export function Timeline({ events, connected, recorded = false }) {
    const reduce = useReducedMotion();
    return (_jsxs("section", { className: "dark-panel timeline-panel", "aria-labelledby": "timeline-heading", "data-tour": "activity", children: [_jsxs("div", { className: "panel-heading", children: [_jsxs("h2", { id: "timeline-heading", children: [_jsx(Radio, { size: 16 }), " Activity"] }), _jsxs("span", { className: `dark-badge feed-indicator ${connected ? 'connected' : ''}`, children: [_jsx("span", { className: "state-dot" }), _jsx(BlurSwap, { text: recorded ? 'Recorded feed' : connected ? 'Live feed' : 'Connecting' })] })] }), events.length > 0 ? (_jsx("ol", { className: "timeline-list", "aria-live": "polite", "aria-relevant": "additions", children: _jsx(AnimatePresence, { initial: false, children: events.map((event) => (_jsxs(motion.li, { initial: reduce ? false : { opacity: 0, y: 5 }, animate: { opacity: 1, y: 0 }, transition: { type: 'spring', stiffness: 380, damping: 32 }, children: [_jsx("time", { className: "event-time mono", dateTime: event.at, children: Number.isNaN(Date.parse(event.at)) ? '—' : time.format(new Date(event.at)) }), _jsxs("div", { className: "event-body", children: [_jsxs("div", { className: "event-first-line", children: [_jsxs("span", { className: `actor actor-${event.actor}`, children: [event.actor === 'nudgebee' && _jsx(Asterisk, { size: 12 }), actorNames[event.actor]] }), _jsx("strong", { children: event.title })] }), _jsx("p", { children: event.detail })] })] }, event.id))) }) })) : _jsx("p", { className: "panel-placeholder", children: "Events will appear as the demo runs." })] }));
}
