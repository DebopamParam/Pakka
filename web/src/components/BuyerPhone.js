import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { ArrowRight, AudioLines, Check, CircleHelp, Mic, Package, Pause, PhoneIncoming, Play, Radio, RotateCw, Smartphone, Truck } from 'lucide-react';
import { motion, useReducedMotion } from 'motion/react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { api, errorText, mockMode } from '../api';
import { courierNames, rupees, updateText } from '../model';
import { BlurSwap } from './MotionText';
import { StatusChip } from './OpsPanels';
import { RecordButton } from './RecordButton';
const responses = ['Haan, bhej do', 'Nahi chahiye', 'Kal bhejna'];
const confirmationRequests = new Map();
const updateRequests = new Map();
function getVoice(cache, key, id) {
    const cached = cache.get(key);
    if (cached)
        return cached;
    const request = api.voicePrompt(id).catch((error) => {
        cache.delete(key);
        throw error;
    });
    cache.set(key, request);
    return request;
}
function VoiceCard({ title, message, update = false, loading, failure, retry, onPlay, recorded = false, demoPlaying = false }) {
    const [playing, setPlaying] = useState(false);
    const [failedPlayback, setFailedPlayback] = useState(false);
    const audio = useRef(null);
    const source = message?.src ?? (message?.audio_wav_base64 && `data:audio/wav;base64,${message.audio_wav_base64}`);
    const Icon = update ? Truck : PhoneIncoming;
    const unavailable = message?.queued ? 'Update queued' : recorded
        ? message?.simulated ? 'Simulated voice in this recording' : 'Recorded audio unavailable'
        : message?.simulated || !update ? 'Voice simulated — Sarvam credits pending' : 'Voice audio unavailable';
    useEffect(() => {
        if (demoPlaying)
            audio.current?.pause();
    }, [demoPlaying]);
    return (_jsxs("article", { className: `voice-card ${update ? 'voice-update' : ''}`, "data-tour": update ? 'voice-update' : 'voice-call', children: [_jsxs("div", { className: "voice-card-header", children: [_jsx("span", { className: "voice-icon", children: _jsx(Icon, { size: 17 }) }), _jsxs("h3", { children: [title, _jsx("span", { children: update ? 'Delivery update' : 'Hinglish · voice call' })] }), source && _jsx("audio", { ref: audio, src: source, preload: "none", onPlay: () => {
                            setPlaying(true);
                            onPlay?.();
                        }, onPause: () => setPlaying(false), onEnded: () => setPlaying(false), onError: () => setFailedPlayback(true) }), _jsx("button", { type: "button", className: "play-button", disabled: !source, "aria-label": playing ? 'Pause voice audio' : 'Play voice audio', onClick: () => {
                            const player = audio.current;
                            if (!player)
                                return;
                            if (player.paused)
                                void player.play().catch(() => setFailedPlayback(true));
                            else
                                player.pause();
                        }, children: playing ? _jsx(Pause, { size: 17 }) : _jsx(Play, { size: 16, fill: "currentColor" }) })] }), message && _jsxs("p", { className: "voice-text", children: ["\u201C", message.text, "\u201D"] }), loading && _jsxs("p", { className: "voice-note", children: [_jsx(AudioLines, { size: 13 }), " Preparing voice audio\u2026"] }), !loading && (failure || failedPlayback) && (_jsxs("p", { className: "voice-note", role: "status", children: [failure || 'The browser could not play this audio.', retry && _jsxs("button", { className: "text-action", type: "button", onClick: retry, children: [_jsx(RotateCw, { size: 12 }), " Retry"] })] })), !loading && !failure && message && (message.simulated || !source) && (_jsxs("p", { className: "voice-note", children: [_jsx(AudioLines, { size: 13 }), unavailable] }))] }));
}
function OrderExperience({ order, onReply, reply }) {
    const [prompt, setPrompt] = useState();
    const [update, setUpdate] = useState();
    const [promptError, setPromptError] = useState('');
    const [updateError, setUpdateError] = useState('');
    const [promptRetry, setPromptRetry] = useState(0);
    const [updateRetry, setUpdateRetry] = useState(0);
    const [sending, setSending] = useState(false);
    const [replyError, setReplyError] = useState('');
    const activeSend = useRef(false);
    const spokenUpdate = order.spoken_update;
    const queuedUpdateText = spokenUpdate?.text;
    const updateCopy = queuedUpdateText ?? (order.status === 'rerouted' ? updateText(order) : undefined);
    const updateKey = updateCopy && `${order.id}:${updateCopy}`;
    const canReply = order.status === 'awaiting_confirm';
    const showPrompt = order.needs_voice_confirm && (canReply || prompt || confirmationRequests.has(order.id));
    const fetchPrompt = showPrompt && (!updateCopy || confirmationRequests.has(order.id));
    const shouldFetchUpdate = Boolean(updateKey && !mockMode && !spokenUpdate?.audio_wav_base64
        && (!spokenUpdate?.played || updateRequests.has(updateKey)));
    useEffect(() => {
        if (!fetchPrompt)
            return;
        let active = true;
        void getVoice(confirmationRequests, order.id, order.id).then((voice) => {
            if (active)
                setPrompt(voice);
        }, (error) => {
            if (active)
                setPromptError(errorText(error));
        });
        return () => { active = false; };
    }, [order.id, fetchPrompt, promptRetry]);
    useEffect(() => {
        if (!shouldFetchUpdate || !updateKey || update)
            return;
        let active = true;
        // The backend serves a queued update once through the same endpoint as the confirmation prompt.
        const request = Promise.resolve(confirmationRequests.get(order.id)).catch(() => undefined)
            .then(() => getVoice(updateRequests, updateKey, order.id));
        void request.then((voice) => {
            if (!active)
                return;
            if (queuedUpdateText && voice.text !== queuedUpdateText) {
                setUpdateError('The delivery update audio is unavailable.');
                return;
            }
            setUpdate(voice);
        }, (error) => {
            if (active)
                setUpdateError(errorText(error));
        });
        return () => { active = false; };
    }, [order.id, queuedUpdateText, shouldFetchUpdate, update, updateKey, updateRetry]);
    const answer = useCallback(async (send) => {
        if (activeSend.current)
            return;
        activeSend.current = true;
        setSending(true);
        setReplyError('');
        try {
            const result = await send();
            onReply(order.id, result);
            if (!result.transcript.trim())
                setReplyError('No transcript is available. Use a quick reply.');
        }
        catch (error) {
            setReplyError(errorText(error));
        }
        finally {
            activeSend.current = false;
            setSending(false);
        }
    }, [onReply, order.id]);
    return (_jsxs("div", { className: "phone-scroll", children: [_jsx(BuyerIdentity, { order: order }), showPrompt && (fetchPrompt || prompt) && _jsx(VoiceCard, { title: canReply ? 'Pakka is calling' : 'Pakka voice call', message: prompt, loading: !prompt && !promptError, failure: promptError, retry: () => { setPromptError(''); setPromptRetry((attempt) => attempt + 1); } }), canReply && (_jsxs("div", { className: "reply-controls", children: [_jsx(RecordButton, { disabled: sending, onError: setReplyError, onSend: (wav) => answer(() => api.voiceReply(order.id, wav)) }), _jsxs("div", { className: "quick-divider", children: [_jsx("span", {}), " Or reply by text ", _jsx("span", {})] }), _jsx("div", { className: "quick-replies", children: responses.map((text) => (_jsx("button", { type: "button", disabled: sending, onClick: () => void answer(() => api.replyText(order.id, text)), children: text }, text))) })] })), replyError && _jsxs("p", { className: "reply-error", role: "status", children: [_jsx(CircleHelp, { size: 14 }), " ", replyError] }), reply && _jsx(ReplyResult, { reply: reply }), updateCopy && (_jsx(VoiceCard, { title: "A new courier", update: true, message: update ?? spokenUpdate ?? { text: updateCopy }, loading: shouldFetchUpdate && !update && !updateError, failure: updateError, retry: shouldFetchUpdate ? () => { setUpdateError(''); setUpdateRetry((attempt) => attempt + 1); } : undefined }, updateKey)), !showPrompt && !updateCopy && _jsxs("div", { className: "phone-empty compact", children: [_jsx(Package, { size: 24 }), _jsx("p", { children: "There\u2019s no voice call for this order." })] }), _jsx(BuyerFooter, { order: order })] }));
}
function BuyerIdentity({ order }) {
    return (_jsxs("div", { className: "buyer-identity", children: [_jsx("span", { className: "buyer-mark", children: _jsx(Package, { size: 17, strokeWidth: 1.7 }) }), _jsxs("div", { children: [_jsx("strong", { children: order.buyer_name }), _jsxs("p", { children: [order.city, " ", _jsx("span", { "aria-hidden": "true", children: "\u00B7" }), " ", rupees.format(order.value), " ", order.cod ? 'COD' : 'prepaid'] })] }), _jsx("span", { className: "buyer-id mono", children: order.id })] }));
}
function ReplyResult({ reply }) {
    const reduce = useReducedMotion();
    return (_jsxs(motion.div, { className: "reply-result", "data-tour": "reply", role: "status", initial: reduce ? false : { opacity: 0, y: 5 }, animate: { opacity: 1, y: 0 }, transition: { type: 'spring', stiffness: 380, damping: 32 }, children: [reply.intent === 'confirm' ? _jsx(Check, { size: 16 }) : _jsx(Mic, { size: 15 }), _jsxs("div", { children: [_jsxs("span", { children: ["Buyer transcript", 'source' in reply && ` · ${reply.source === 'claude' ? 'Claude' : reply.source}`] }), _jsx("strong", { children: reply.transcript ? `“${reply.transcript}”` : 'No transcript' })] }), _jsx("span", { className: "intent mono", children: reply.intent })] }));
}
function BuyerFooter({ order }) {
    return (_jsxs("div", { className: "buyer-footer", children: [_jsx(StatusChip, { status: order.status }), _jsxs("span", { children: [_jsx(ArrowRight, { size: 12 }), " ", courierNames[order.courier] ?? order.courier] })] }));
}
export function BuyerPhone({ order, experience }) {
    const replay = experience.kind === 'replay';
    const label = replay ? 'Recorded buyer' : mockMode ? 'Simulated buyer' : 'Buyer preview';
    const update = replay && (experience.update ?? (order?.spoken_update ? {
        text: order.spoken_update.text,
        queued: true,
    } : undefined));
    const updateCard = replay && update && (_jsx(VoiceCard, { title: "A new courier", message: update, update: true, recorded: true, demoPlaying: experience.demoPlaying, onPlay: experience.pause }));
    return (_jsxs("aside", { className: "buyer-stage", "aria-labelledby": "buyer-heading", children: [_jsxs("header", { className: "stage-heading", children: [_jsxs("div", { children: [_jsxs("p", { children: [_jsx(Smartphone, { size: 15 }), " Buyer view"] }), _jsxs("h2", { id: "buyer-heading", children: ["Across", _jsx("span", { children: "the line." })] })] }), _jsx("span", { className: "stage-signal", title: label, "aria-hidden": "true", children: _jsx(Radio, { size: 15 }) })] }), _jsx("div", { className: "device", children: _jsxs("div", { className: "device-screen", children: [_jsx("div", { className: "device-top", "aria-hidden": "true", children: _jsx("span", {}) }), _jsxs("div", { className: "device-brand", children: [_jsx("div", { className: "brand-mark small", children: _jsx(Package, { size: 15 }) }), _jsx("strong", { children: "Pakka" }), _jsx("span", { children: "Jaipur Kurta Co." })] }), order && experience.kind === 'live' && _jsx(OrderExperience, { order: order, reply: experience.reply, onReply: experience.onReply }, order.id), order && experience.kind === 'replay' && (_jsxs("div", { className: "phone-scroll", children: [_jsx(BuyerIdentity, { order: order }), experience.update && updateCard, experience.prompt && _jsx(VoiceCard, { title: "Pakka voice call", message: experience.prompt, recorded: true, demoPlaying: experience.demoPlaying, onPlay: experience.pause }), experience.reply && _jsx(ReplyResult, { reply: experience.reply }), !experience.update && updateCard, _jsx(BuyerFooter, { order: order })] }, order.id)), !order && _jsxs("div", { className: "phone-empty", children: [_jsx(PhoneIncoming, { size: 28 }), _jsx("p", { children: "No order selected." }), _jsx("span", { children: replay ? 'The recorded order will appear here.' : 'Choose an order to see the buyer’s call.' })] }), _jsx("div", { className: "device-bottom", "aria-hidden": "true", children: _jsx("span", {}) })] }) }), _jsxs("div", { className: "stage-footer", children: [_jsx("span", { className: "state-dot" }), _jsx(BlurSwap, { text: label })] })] }));
}
