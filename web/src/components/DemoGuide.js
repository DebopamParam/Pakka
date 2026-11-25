import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { ArrowUpRight, PhoneCall, Route, ShoppingCart, UserCheck, Volume2 } from 'lucide-react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { useEffect, useLayoutEffect, useState } from 'react';
import { rupees } from '../model';
import narration from '../narration.json';
const spring = { type: 'spring', stiffness: 170, damping: 22 };
function clipLine(text, from) {
    const sentences = text.split(/(?<=[.?!])\s+/);
    return sentences.find((sentence) => sentence.includes(from)) ?? text;
}
function script(run) {
    const beats = steps(run);
    // Each caption starts when the narrator starts its line.
    for (const [id, starts] of Object.entries(narration)) {
        starts.forEach((at, i) => { if (beats[id][i])
            beats[id][i].at = at; });
    }
    return beats;
}
function steps(run) {
    const last = run.frames[run.frames.length - 1];
    const buyer = last.state.orders.find((order) => order.id === run.orderId);
    const name = buyer?.buyer_name.split(' ')[0] ?? 'The buyer';
    const amount = buyer ? rupees.format(buyer.value) : 'the order';
    const find = (pattern) => last.events.map((event) => pattern.exec(`${event.title} | ${event.detail}`)).find(Boolean);
    const segment = find(new RegExp(`Flagsmith evaluated ${buyer?.buyer_name ?? ''} \\| segment (\\w+)`))?.[1];
    const p95 = find(/hub jammed \| p95 (\d+) ms/)?.[1];
    const moved = find(/Rerouted \w+ → \w+ \| (\d+) in-flight/)?.[1];
    const prefixes = find(/courier_routing updated \| prefixes ([\d, ]+) now/)?.[1];
    const reply = run.reply;
    return {
        start: [{ at: 0, actor: 'Pakka', text: 'Festive rush at Jaipur Kurta Co. Pakka turns the traffic into profit, with less waste.' }],
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
        jam: [{ at: 0, actor: 'SwiftShip', text: `Trouble: SwiftShip's Bengaluru hub jams${p95 ? ` — p95 latency hits ${Number(p95).toLocaleString('en-IN')} ms` : ''}.`, target: 'courier-swiftship', label: 'Hub jams' }],
        crash: [
            {
                at: 0, actor: 'Kubernetes', text: 'In our Kubernetes cluster, the SwiftShip pod falls into CrashLoopBackOff.',
                target: 'courier-swiftship', label: 'Pod crashes',
                proof: run.proofs.pods_crash ? { sponsor: 'Kubernetes', title: 'kubectl get pods', text: run.proofs.pods_crash } : undefined,
            },
            {
                at: 5000, actor: 'NudgeBee', text: 'NudgeBee detects the crash loop and starts the reroute runbook.',
                feature: 'NudgeBee · Kubernetes event detection → automation event trigger',
                target: 'courier-swiftship', label: 'NudgeBee detects',
                proof: { sponsor: 'NudgeBee', title: 'Crash loop detected in our cluster', src: '/proof/nudgebee-detected.png' },
            },
        ],
        reroute: [
            {
                at: 0, actor: 'NudgeBee', human: true, text: 'Nothing changes until a person says yes: the automation stops at its approval step, and on-call approves it.',
                target: 'routing', label: 'A person approves',
                feature: 'NudgeBee · approval step in the automation',
                proof: { sponsor: 'NudgeBee', title: 'Waiting for on-call approval', src: '/proof/nudgebee-approval.png' },
            },
            {
                at: 3500, actor: 'Flagsmith', text: `NudgeBee's script calls Pakka, which rewrites courier_routing in Flagsmith: pincodes ${prefixes ?? '56, 58'} → DakExpress.`,
                target: 'routing', label: 'Flagsmith reroutes',
                feature: 'NudgeBee · run-script action → Flagsmith · Admin API updates the courier_routing remote config',
                proof: { sponsor: 'NudgeBee', title: 'Event trigger → approval → run script', src: '/proof/nudgebee-automation.png' },
            },
            {
                at: 9000, actor: 'Pakka', text: `${moved ?? 'The'} in-flight orders move to DakExpress. No code deploy.`, target: 'orders', label: 'Orders moved',
                feature: 'Flagsmith · remote config, changed live',
                proof: { sponsor: 'Flagsmith', title: 'courier_routing remote config', src: '/proof/flagsmith-routing.png' },
            },
        ],
        update: [{
                at: 0, actor: 'Sarvam AI', hinglish: true, target: 'voice-update', label: `Sarvam tells ${name}`,
                text: `“${clipLine(run.update.text, 'DakExpress')}”`,
                gloss: `Sarvam AI tells ${name}: “The Bengaluru hub is delayed, so your ${amount} order now ships with DakExpress.”`,
                feature: 'Sarvam AI · Bulbul text-to-speech in Hinglish',
            }],
        end: [
            { at: 0, actor: 'Pakka', text: `Fewer returns, no stuck orders: ${moved ?? 'every'} orders rerouted, ${name} kept in the loop.`, target: 'orders', label: 'Delivered pakka', feature: 'Also in Flagsmith: voice_confirm_enabled kill switch · prepaid_nudge A/B test · peak_priority' },
        ],
    };
}
function useTargetRect(target, scroll) {
    const [rect, setRect] = useState();
    const reduce = useReducedMotion();
    useEffect(() => {
        if (!target || !scroll)
            return;
        document.querySelector(`[data-tour="${target}"]`)?.scrollIntoView({ block: 'center', behavior: reduce ? 'auto' : 'smooth' });
    }, [target, scroll, reduce]);
    useLayoutEffect(() => {
        if (!target) {
            setRect(undefined);
            return;
        }
        let frame = 0;
        const measure = () => {
            const box = document.querySelector(`[data-tour="${target}"]`)?.getBoundingClientRect();
            setRect((previous) => {
                if (!box)
                    return undefined;
                if (previous && previous.x === box.x && previous.y === box.y && previous.width === box.width && previous.height === box.height)
                    return previous;
                return { x: box.x, y: box.y, width: box.width, height: box.height };
            });
            frame = requestAnimationFrame(measure);
        };
        measure();
        return () => cancelAnimationFrame(frame);
    }, [target]);
    return rect;
}
const POINTS = [
    { icon: PhoneCall, title: 'Fewer wasted returns', text: 'Flagsmith segments each buyer: Sarvam AI confirms risky COD by voice, and repeat returners get no COD.' },
    { icon: ShoppingCart, title: 'High-value carts first at peak', text: 'At peak, big carts skip a jammed courier hub at once.' },
    { icon: Route, title: 'Move orders off a failing courier hub', text: 'NudgeBee catches the crash, a person approves, Flagsmith reroutes. No deploy.' },
];
function Intro({ playing }) {
    return (_jsxs(motion.section, { className: "tour-intro", "aria-label": "What Pakka does", initial: { opacity: 0, y: 16 }, animate: { opacity: 1, y: 0 }, exit: { opacity: 0, y: -10, scale: 0.98 }, transition: { duration: 0.35, ease: [0.22, 1, 0.36, 1] }, children: [_jsx("p", { className: "tour-intro-eyebrow", children: "Pakka \u00B7 smart festive logistics" }), _jsx("h2", { children: "More profit from festive traffic." }), _jsx("p", { className: "tour-intro-lede", children: "Festive rushes waste money: parcels that come back, hubs that jam, big carts stuck behind small ones. Pakka runs the logistics for Indian D2C brands, live, with no code deploys." }), _jsx("ul", { children: POINTS.map(({ icon: Icon, title, text }) => (_jsxs("li", { children: [_jsx("span", { className: "tour-intro-icon", children: _jsx(Icon, { size: 18 }) }), _jsxs("div", { children: [_jsx("strong", { children: title }), _jsx("p", { children: text })] })] }, title))) }), !playing && _jsxs("p", { className: "tour-intro-hint", children: [_jsx(Volume2, { size: 14 }), " Press Play the demo, with sound on"] })] }));
}
function Presenter({ label }) {
    return (_jsxs("div", { className: "presenter-figure", children: [_jsxs("svg", { viewBox: "0 0 160 160", "aria-hidden": "true", children: [_jsx("line", { x1: "66", y1: "74", x2: "150", y2: "10", className: "presenter-stick" }), _jsx("circle", { cx: "40", cy: "58", r: "14" }), _jsx("path", { d: "M40 72v42M40 114l-13 36M40 114l13 36M40 86l-19 22M40 86l28-14" })] }), _jsx("span", { className: "presenter-label", children: label })] }));
}
export function DemoGuide({ run, playback, onProof }) {
    const { frame, index, playing, finished } = playback;
    const reduce = useReducedMotion();
    const [clock, setClock] = useState({ index, elapsed: 0 });
    const elapsed = clock.index === index ? clock.elapsed : 0;
    const active = playing || finished;
    useEffect(() => {
        if (!active)
            return;
        let last = performance.now();
        const timer = window.setInterval(() => {
            const now = performance.now();
            setClock((previous) => ({ index, elapsed: (previous.index === index ? previous.elapsed : 0) + now - last }));
            last = now;
        }, 200);
        return () => window.clearInterval(timer);
    }, [active, index]);
    const beats = script(run)[frame.id];
    const beatIndex = Math.max(0, beats.filter((item) => item.at <= elapsed).length - 1);
    const beat = beats[beatIndex];
    const target = active ? beat.target : undefined;
    const rect = useTargetRect(target, playing);
    const shown = (playing || index > 0) && beat;
    const transition = reduce ? { duration: 0 } : spring;
    const pad = 8;
    const tip = rect && { x: rect.x + Math.min(rect.width * 0.3, 90), y: rect.y + Math.min(rect.height / 2, 34) };
    const flip = tip ? tip.x < 190 : false;
    const proof = active ? beat.proof : undefined;
    const proofWidth = beat.human ? 520 : 320;
    const proofLeft = rect && (rect.x + rect.width + proofWidth + 16 < window.innerWidth ? rect.x + rect.width + 16 : Math.max(16, rect.x - proofWidth - 16));
    const proofTop = rect && Math.min(Math.max(16, rect.y), window.innerHeight - 440);
    return (_jsxs(_Fragment, { children: [_jsxs(AnimatePresence, { children: [rect && (_jsx(motion.div, { className: "tour-spotlight", "aria-hidden": "true", initial: { opacity: 0 }, exit: { opacity: 0 }, animate: { opacity: 1, left: rect.x - pad, top: rect.y - pad, width: rect.width + pad * 2, height: rect.height + pad * 2 }, transition: transition }, "spotlight")), tip && (_jsxs(motion.div, { className: `tour-presenter${flip ? ' presenter-flip' : ''}`, "aria-hidden": "true", initial: { opacity: 0, x: tip.x, y: tip.y }, exit: { opacity: 0 }, animate: { opacity: 1, x: tip.x, y: tip.y }, transition: transition, children: [_jsx("span", { className: "presenter-ring" }), _jsx(Presenter, { label: beat.label ?? beat.actor })] }, "presenter")), proof && proofLeft != null && proofTop != null && (_jsxs(motion.button, { type: "button", className: `tour-proof${beat.human ? ' tour-proof-human' : ''}`, style: { left: proofLeft, top: proofTop }, initial: reduce ? false : { opacity: 0, scale: 0.92, y: 8 }, animate: { opacity: 1, scale: 1, y: 0 }, exit: { opacity: 0, scale: 0.96 }, transition: transition, onClick: () => onProof(proof.sponsor), children: [_jsxs("span", { className: "tour-proof-head", children: [_jsx("strong", { children: proof.sponsor }), proof.title] }), proof.src ? _jsx("img", { src: proof.src, alt: proof.title }) : _jsx("pre", { children: proof.text }), _jsx("span", { className: "tour-proof-hint", children: "Click to enlarge" })] }, proof.title))] }), _jsx(AnimatePresence, { children: index === 0 && _jsx(Intro, { playing: playing }, "intro") }), _jsx(AnimatePresence, { mode: "wait", children: shown && (_jsxs(motion.div, { className: "tour-caption", role: "status", initial: reduce ? false : { opacity: 0, y: 12 }, animate: { opacity: 1, y: 0 }, exit: { opacity: 0, y: -6 }, transition: { duration: reduce ? 0 : 0.22 }, children: [_jsxs("div", { className: "tour-badges", children: [beat.human && _jsxs("span", { className: "tour-badge badge-human", children: [_jsx(UserCheck, { size: 13 }), " Human in the loop"] }), _jsx("span", { className: `tour-badge badge-${beat.actor.toLowerCase().replace(/[^a-z]/g, '')}`, children: beat.actor })] }), _jsxs("div", { children: [_jsx("p", { lang: beat.hinglish ? 'hi-Latn' : undefined, children: beat.text }), beat.gloss && _jsx("p", { className: "tour-gloss", children: beat.gloss }), beat.feature && _jsx("p", { className: "tour-feature", children: beat.feature }), frame.id === 'end' && (_jsxs("a", { href: "https://github.com/DebopamParam/Pakka", target: "_blank", rel: "noreferrer", children: ["github.com/DebopamParam/Pakka ", _jsx(ArrowUpRight, { size: 14 })] }))] })] }, `${frame.id}-${beatIndex}`)) })] }));
}
