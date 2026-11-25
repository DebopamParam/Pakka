import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { ArrowUpRight, AudioLines, Code2, Image, Pause, Play, RotateCcw, Terminal, X } from 'lucide-react';
import { useLayoutEffect, useRef } from 'react';
const steps = {
    start: { name: 'Start', actor: 'Pakka' },
    order: { name: 'Order', actor: 'Flagsmith' },
    call: { name: 'Call', actor: 'Sarvam AI' },
    reply: { name: 'Reply', actor: 'Buyer' },
    jam: { name: 'Jam', actor: 'SwiftShip' },
    crash: { name: 'Crash', actor: 'Kubernetes' },
    reroute: { name: 'Reroute', actor: 'NudgeBee + Flagsmith' },
    update: { name: 'Update', actor: 'Sarvam AI' },
    end: { name: 'Finish', actor: 'Pakka' },
};
const dateInIndia = new Intl.DateTimeFormat('en-IN', {
    dateStyle: 'medium', timeStyle: 'short', timeZone: 'Asia/Kolkata',
});
export function ReplayControls({ run, playback }) {
    const { frame, index, playing, finished, audioError, play, pause, jump } = playback;
    const actor = frame.id === 'reply' && run.reply?.source === 'claude' ? 'Claude' : steps[frame.id].actor;
    return (_jsxs("section", { className: "replay-controls", "aria-label": "Recorded demo", children: [_jsxs("div", { className: "replay-actions", children: [_jsxs("button", { type: "button", className: "new-order replay-play", onClick: () => playing ? pause() : play(), children: [playing ? _jsx(Pause, { size: 15 }) : _jsx(Play, { size: 15, fill: "currentColor" }), playing ? 'Pause demo' : finished ? 'Replay demo' : 'Play the demo'] }), _jsx("button", { type: "button", className: "replay-restart", "aria-label": "Restart demo", title: "Restart demo", onClick: () => play(true), children: _jsx(RotateCcw, { size: 16 }) })] }), _jsxs("div", { className: "replay-position", children: [_jsxs("p", { className: "replay-caption", role: "status", children: [_jsx("strong", { children: actor }), _jsx("span", { children: frame.label })] }), _jsx("ol", { className: "replay-steps", "aria-label": "Recorded steps", children: run.frames.map((step, number) => (_jsx("li", { children: _jsx("button", { type: "button", "aria-current": index === number ? 'step' : undefined, className: number < index ? 'step-complete' : undefined, onClick: () => jump(number), children: steps[step.id].name }) }, step.id))) })] }), _jsxs("div", { className: "replay-recording", children: [_jsxs("p", { children: ["Replay of a real run ", _jsx("span", { "aria-hidden": "true", children: "\u00B7" }), " recorded ", _jsxs("time", { dateTime: run.recordedAt, children: [dateInIndia.format(new Date(run.recordedAt)), " IST"] })] }), _jsxs("a", { href: "https://github.com/DebopamParam/Pakka", target: "_blank", rel: "noreferrer", children: ["GitHub repo ", _jsx(ArrowUpRight, { size: 13 })] })] }), audioError && _jsx("p", { className: "replay-audio-error", role: "status", children: audioError })] }));
}
const sponsors = [
    { id: 'flagsmith', name: 'Flagsmith', label: 'COD and routing rules', icon: Image },
    { id: 'nudgebee', name: 'NudgeBee', label: 'Incident and approval', icon: Image },
    { id: 'sarvam', name: 'Sarvam AI', label: 'Hinglish voice clips', icon: AudioLines },
    { id: 'claude', name: 'Claude', label: 'Buyer reply intent', icon: Code2 },
    { id: 'kubernetes', name: 'Kubernetes', label: 'Pod status', icon: Terminal },
];
function sponsorId(name) {
    const id = name.toLowerCase().replace(/[^a-z0-9]/g, '');
    return id === 'sarvamai' ? 'sarvam' : id;
}
function ClipProof({ title, clip }) {
    return (_jsxs("section", { className: "proof-evidence", children: [_jsx("h3", { children: title }), _jsx("p", { lang: "hi-Latn", children: clip.text }), clip.src && _jsx("audio", { controls: true, preload: "none", src: clip.src, "aria-label": title }), clip.simulated && _jsx("p", { children: "Simulated voice in this recording." }), !clip.src && !clip.simulated && _jsx("p", { children: "Recorded audio unavailable." })] }));
}
export function ReplayProof({ run, images, selected, onSelect, hidden }) {
    const dialog = useRef(null);
    const cards = new Map(sponsors.map((sponsor) => [sponsor.id, { ...sponsor, images: [] }]));
    for (const image of images) {
        const id = sponsorId(image.sponsor);
        const card = cards.get(id);
        if (card)
            card.images.push(image);
        else
            cards.set(id, { id, name: image.sponsor, label: 'Recorded screenshot', icon: Image, images: [image] });
    }
    const card = cards.get(sponsorId(selected));
    useLayoutEffect(() => {
        if (selected && !dialog.current?.open)
            dialog.current?.showModal();
    }, [selected]);
    return (_jsxs("section", { className: `proof-strip${hidden ? ' proof-strip-hidden' : ''}`, "aria-labelledby": "proof-heading", children: [_jsx("h2", { id: "proof-heading", children: "Proof" }), _jsx("div", { className: "proof-cards", children: [...cards.values()].map(({ id, name, label, icon: Icon, images: screenshots }) => (_jsxs("button", { type: "button", className: "proof-card", "aria-haspopup": "dialog", onClick: () => onSelect(id), children: [_jsx("span", { className: "proof-thumb", children: screenshots[0] ? _jsx("img", { src: screenshots[0].src, alt: "" }) : _jsx(Icon, { size: 16, strokeWidth: 1.7 }) }), _jsxs("span", { children: [_jsx("strong", { children: name }), _jsx("span", { children: label })] })] }, id))) }), _jsx("dialog", { ref: dialog, className: "proof-dialog", "aria-labelledby": "proof-title", onClose: () => onSelect(''), onClick: (event) => { if (event.target === event.currentTarget)
                    event.currentTarget.close(); }, children: card && _jsxs(_Fragment, { children: [_jsxs("header", { children: [_jsx("h2", { id: "proof-title", children: card.name }), _jsx("form", { method: "dialog", children: _jsx("button", { type: "submit", "aria-label": "Close proof", children: _jsx(X, { size: 20 }) }) })] }), _jsxs("div", { className: "proof-dialog-body", children: [card.id === 'kubernetes' && (_jsxs("div", { className: "proof-pods", children: [_jsxs("section", { children: [_jsx("h3", { children: "During the crash" }), _jsx("pre", { children: run.proofs.pods_crash || 'Pod output unavailable.' })] }), _jsxs("section", { children: [_jsx("h3", { children: "After rerouting" }), _jsx("pre", { children: run.proofs.pods_after || 'Pod output unavailable.' })] })] })), card.id === 'sarvam' && (_jsxs(_Fragment, { children: [_jsx(ClipProof, { title: "Confirmation call", clip: run.confirm }), _jsx(ClipProof, { title: "Courier update", clip: run.update })] })), card.id === 'claude' && (run.reply ? _jsxs("section", { className: "proof-evidence", children: [_jsx("h3", { children: "Typed buyer reply" }), _jsxs("p", { lang: "hi-Latn", children: ["\u201C", run.reply.transcript, "\u201D"] }), _jsxs("dl", { className: "mono", children: [_jsx("dt", { children: "intent" }), _jsx("dd", { children: run.reply.intent }), _jsx("dt", { children: "intent_source" }), _jsx("dd", { children: run.reply.source })] })] }) : _jsx("p", { children: "Recorded reply unavailable." })), card.images.map(({ src, title }) => (_jsxs("figure", { children: [_jsx("figcaption", { children: title }), _jsx("img", { src: src, alt: title })] }, src))), card.images.length === 0 && (card.id === 'flagsmith' || card.id === 'nudgebee') && _jsx("p", { children: "Screenshots unavailable." })] })] }) })] }));
}
