import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { CircleAlert, PackageCheck, Plus, RotateCcw, Zap } from 'lucide-react';
import { motion, useReducedMotion } from 'motion/react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { api, errorText, mockMode } from './api';
import { BuyerPhone } from './components/BuyerPhone';
import { BlurSwap } from './components/MotionText';
import { CourierHealth, Orders, Routing, Timeline } from './components/OpsPanels';
import { DemoGuide } from './components/DemoGuide';
import { ReplayControls, ReplayProof } from './components/ReplayControls';
import { sortOrders } from './model';
import { demoVideo, replay, replayMode } from './replay';
import { useReplay } from './useReplay';
function useOps() {
    const [state, setState] = useState();
    const [events, setEvents] = useState([]);
    const [connected, setConnected] = useState(false);
    const [connectionError, setConnectionError] = useState('');
    const requestId = useRef(0);
    const polling = useRef(false);
    const refresh = useCallback(async () => {
        const id = ++requestId.current;
        try {
            const result = await api.state();
            if (id === requestId.current) {
                setState(result);
                setConnectionError('');
            }
        }
        catch (error) {
            if (id === requestId.current)
                setConnectionError(errorText(error));
        }
    }, []);
    useEffect(() => {
        const tick = () => {
            if (polling.current)
                return;
            polling.current = true;
            void refresh().finally(() => { polling.current = false; });
        };
        tick();
        const timer = window.setInterval(tick, 2000);
        return () => window.clearInterval(timer);
    }, [refresh]);
    useEffect(() => api.events((event) => setEvents((existing) => existing.some((item) => item.id === event.id) ? existing : [event, ...existing].slice(0, 100)), setConnected), []);
    return { state, events, connected, connectionError, refresh };
}
function LiveApp() {
    const { state, events, connected, connectionError, refresh } = useOps();
    const reduce = useReducedMotion();
    const [selectedId, setSelectedId] = useState();
    const [reasons, setReasons] = useState({});
    const [replies, setReplies] = useState({});
    const [faultRequested, setFaultRequested] = useState();
    const [creating, setCreating] = useState(false);
    const [faultPending, setFaultPending] = useState(false);
    const [orderError, setOrderError] = useState('');
    const [faultError, setFaultError] = useState('');
    const orders = state ? sortOrders(state.orders) : [];
    const order = orders.find((item) => item.id === selectedId)
        ?? orders.find((item) => !item.background && item.status === 'awaiting_confirm')
        ?? orders[0];
    const defaultId = order?.id;
    useEffect(() => {
        if (defaultId)
            setSelectedId((previous) => previous ?? defaultId);
    }, [defaultId]);
    const faultOn = faultRequested ?? isJammed(state);
    const onReply = useCallback((id, reply) => {
        setReplies((previous) => ({ ...previous, [id]: reply }));
        void refresh();
    }, [refresh]);
    async function createOrder() {
        setOrderError('');
        setCreating(true);
        try {
            const response = await api.createOrder();
            setReasons((previous) => ({ ...previous, [response.order.id]: response.decision.reason }));
            setSelectedId(response.order.id);
            await refresh();
        }
        catch (error) {
            setOrderError(errorText(error));
        }
        finally {
            setCreating(false);
        }
    }
    async function changeFault() {
        const on = !faultOn;
        setFaultPending(true);
        setFaultError('');
        try {
            await api.jam(on);
            setFaultRequested(on);
            await refresh();
        }
        catch (error) {
            setFaultError(errorText(error));
        }
        finally {
            setFaultPending(false);
        }
    }
    const press = reduce ? undefined : { scale: 0.97 };
    const hover = reduce ? undefined : { y: -2 };
    const spring = { type: 'spring', stiffness: 520, damping: 34 };
    return _jsx(Dashboard, { state: state, events: events, connected: connected, order: order, onSelect: setSelectedId, reasons: reasons, faultRequested: faultRequested, experience: { kind: 'live', onReply, reply: order && replies[order.id] }, orderAction: _jsxs(motion.button, { className: "new-order", type: "button", whileTap: press, whileHover: hover, transition: spring, disabled: creating, onClick: () => void createOrder(), children: [_jsx(Plus, { size: 17, strokeWidth: 2.4 }), _jsx(BlurSwap, { text: creating ? 'Creating…' : 'New order' })] }), errors: _jsxs(_Fragment, { children: [connectionError && _jsxs("p", { className: "page-error", role: "status", children: [_jsx(CircleAlert, { size: 15 }), " Control tower unavailable. ", connectionError] }), orderError && _jsxs("p", { className: "page-error", role: "alert", children: [_jsx(CircleAlert, { size: 15 }), " ", orderError] })] }), faultAction: _jsxs(_Fragment, { children: [_jsxs("div", { className: "fault-box", children: [_jsxs("div", { className: "fault-label", children: [_jsx("span", { className: "fault-icon", children: _jsx(Zap, { size: 15 }) }), _jsxs("div", { children: [_jsx("strong", { children: "Fault" }), _jsx("p", { children: "SwiftShip \u00B7 Bengaluru hub" })] })] }), _jsxs(motion.button, { className: "fault-button", type: "button", whileTap: press, whileHover: hover, transition: spring, disabled: faultPending, onClick: () => void changeFault(), children: [faultOn ? _jsx(RotateCcw, { size: 14 }) : _jsx(Zap, { size: 14 }), _jsx(BlurSwap, { text: faultPending ? 'Sending…' : faultOn ? 'Recover' : 'Jam Bengaluru hub' })] })] }), faultError && _jsxs("p", { className: "page-error", role: "alert", children: [_jsx(CircleAlert, { size: 15 }), " ", faultError] })] }) });
}
function isJammed(state) {
    return state?.couriers.some((courier) => courier.id === 'swiftship' && courier.status === 'jammed') ?? false;
}
function Dashboard({ state, events, order, onSelect, experience, connected = false, reasons = {}, faultRequested, orderAction, errors, faultAction, toolbar, guide, faultStarted = false, }) {
    const recorded = experience.kind === 'replay';
    const jammed = isJammed(state);
    const routing = state?.routing;
    const rerouted = routing?.by_prefix['56'] === 'dakexpress' && routing.by_prefix['58'] === 'dakexpress';
    const incident = jammed ? (rerouted ? 'TRAFFIC REROUTED' : 'HUB JAMMED')
        : faultStarted ? 'FAULT INJECTED'
            : faultRequested && !rerouted ? 'JAM REQUESTED'
                : rerouted ? 'FALLBACK ACTIVE' : state ? 'ALL CLEAR' : 'AWAITING STATE';
    const orders = state ? sortOrders(state.orders) : [];
    return (_jsxs(_Fragment, { children: [_jsx("header", { className: "page-header", children: _jsxs("nav", { className: "island", "aria-label": "Pakka", children: [_jsxs("div", { className: "nav-brand", children: [_jsx("span", { className: "brand-mark", children: _jsx(PackageCheck, { size: 19, strokeWidth: 1.9 }) }), _jsx("strong", { children: "Pakka" })] }), _jsx("p", { children: "Smart festive logistics, less waste." }), _jsxs("div", { className: `incident-pill mono ${(jammed || faultStarted) && !rerouted ? 'incident-active' : ''}`, role: "status", children: [_jsx("span", { className: "state-dot" }), _jsx(BlurSwap, { text: incident })] })] }) }), toolbar, _jsxs("main", { className: `dashboard${recorded ? ' dashboard-replay' : ''}`, children: [_jsxs("section", { className: "ops", "aria-labelledby": "ops-heading", children: [_jsxs("div", { className: "ops-heading-row", children: [_jsxs("h1", { id: "ops-heading", children: ["Brand ops", _jsx("span", { children: "Jaipur Kurta Co." })] }), orderAction] }), errors, _jsx(CourierHealth, { couriers: state?.couriers ?? [], recorded: recorded }), _jsx(Orders, { orders: orders, selectedId: order?.id, onSelect: onSelect, reasons: reasons, simulated: state?.simulated ?? (!recorded && mockMode) }), _jsxs("div", { className: "ops-bottom", children: [_jsx(Routing, { routing: routing, changed: rerouted }), _jsx(Timeline, { events: events, connected: connected, recorded: recorded })] }), faultAction] }), _jsxs("div", { className: "side", children: [_jsx(BuyerPhone, { order: order, experience: experience }), recorded && demoVideo && (_jsx("section", { className: "demo-video", "aria-label": "Demo video", children: _jsx("iframe", { src: `https://www.youtube-nocookie.com/embed/${demoVideo}`, title: "Pakka demo video", allow: "encrypted-media; picture-in-picture; fullscreen", allowFullScreen: true, loading: "lazy" }) }))] })] }), guide] }));
}
function RecordedApp({ run, images }) {
    const playback = useReplay(run);
    const { frame, index, pause } = playback;
    const [selection, setSelection] = useState();
    const [proof, setProof] = useState('');
    const openProof = (id) => {
        if (id)
            pause();
        setProof(id);
    };
    const selectedId = selection?.index === index ? selection.id : run.orderId;
    const order = frame.state.orders.find((item) => item.id === selectedId);
    const reached = (id) => run.frames.slice(0, index + 1).some((step) => step.id === id);
    const recordedBuyer = order?.id === run.orderId;
    return _jsx(Dashboard, { state: frame.state, events: frame.events, order: order, onSelect: (id) => setSelection({ index, id }), faultStarted: frame.id === 'jam', experience: {
            kind: 'replay',
            prompt: recordedBuyer && reached('call') ? run.confirm : undefined,
            update: recordedBuyer && reached('update') ? run.update : undefined,
            reply: recordedBuyer && reached('reply') ? run.reply : undefined,
            pause,
            demoPlaying: playback.playing,
        }, toolbar: _jsxs("div", { className: "replay-toolbar", children: [_jsx(ReplayControls, { run: run, playback: playback }), _jsx(ReplayProof, { run: run, images: images, selected: proof, onSelect: openProof, hidden: playback.playing })] }), guide: _jsx(DemoGuide, { run: run, playback: playback, onProof: openProof }) });
}
function ReplayApp() {
    const [recording, setRecording] = useState({ status: 'loading' });
    const [images, setImages] = useState([]);
    const [attempt, setAttempt] = useState(0);
    useEffect(() => {
        const request = new AbortController();
        void replay.load(request.signal).then((run) => setRecording({ status: 'loaded', run }), () => { if (!request.signal.aborted)
            setRecording({ status: 'failed' }); });
        void replay.proofImages(request.signal).then(setImages, () => { });
        return () => request.abort();
    }, [attempt]);
    if (recording.status === 'loaded')
        return _jsx(RecordedApp, { run: recording.run, images: images });
    return (_jsx("div", { className: "replay-toolbar replay-loading", role: "status", children: recording.status === 'loading' ? _jsx("p", { children: "Loading recorded demo\u2026" }) : _jsxs(_Fragment, { children: [_jsx("p", { children: "The recorded demo could not load." }), _jsx("button", { type: "button", className: "new-order", onClick: () => {
                        setRecording({ status: 'loading' });
                        setAttempt((count) => count + 1);
                    }, children: "Retry" })] }) }));
}
export function App() {
    return replayMode ? _jsx(ReplayApp, {}) : _jsx(LiveApp, {});
}
