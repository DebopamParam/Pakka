import { ArrowRight, AudioLines, Check, CircleHelp, Mic, Package, Pause, PhoneIncoming, Play, Radio, RotateCw, Smartphone, Truck } from 'lucide-react'
import { motion, useReducedMotion } from 'motion/react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { api, errorText, mockMode } from '../api'
import { courierNames, rupees, updateText } from '../model'
import type { Order, Reply, Voice } from '../model'
import type { RecordedReply, ReplayClip } from '../replay'
import { BlurSwap } from './MotionText'
import { StatusChip } from './OpsPanels'
import { RecordButton } from './RecordButton'

const responses = ['Haan, bhej do', 'Nahi chahiye', 'Kal bhejna']
const confirmationRequests = new Map<string, Promise<Voice>>()
const updateRequests = new Map<string, Promise<Voice>>()

function getVoice(cache: Map<string, Promise<Voice>>, key: string, id: string) {
  const cached = cache.get(key)
  if (cached) return cached
  const request = api.voicePrompt(id).catch((error: unknown) => {
    cache.delete(key)
    throw error
  })
  cache.set(key, request)
  return request
}

type Message = {
  text: string
  audio_wav_base64?: string | null
  src?: string
  queued?: boolean
  simulated?: boolean
}

function VoiceCard({ title, message, update = false, loading, failure, retry, onPlay, recorded = false, demoPlaying = false }: {
  title: string
  message?: Message
  update?: boolean
  loading?: boolean
  failure?: string
  retry?: () => void
  onPlay?: () => void
  recorded?: boolean
  demoPlaying?: boolean
}) {
  const [playing, setPlaying] = useState(false)
  const [failedPlayback, setFailedPlayback] = useState(false)
  const audio = useRef<HTMLAudioElement>(null)
  const source = message?.src ?? (message?.audio_wav_base64 && `data:audio/wav;base64,${message.audio_wav_base64}`)
  const Icon = update ? Truck : PhoneIncoming
  const unavailable = message?.queued ? 'Update queued' : recorded
    ? message?.simulated ? 'Simulated voice in this recording' : 'Recorded audio unavailable'
    : message?.simulated || !update ? 'Voice simulated — Sarvam credits pending' : 'Voice audio unavailable'

  useEffect(() => {
    if (demoPlaying) audio.current?.pause()
  }, [demoPlaying])

  return (
    <article className={`voice-card ${update ? 'voice-update' : ''}`} data-tour={update ? 'voice-update' : 'voice-call'}>
      <div className="voice-card-header">
        <span className="voice-icon"><Icon size={17} /></span>
        <h3>{title}<span>{update ? 'Delivery update' : 'Hinglish · voice call'}</span></h3>
        {source && <audio
          ref={audio}
          src={source}
          preload="none"
          onPlay={() => {
            setPlaying(true)
            onPlay?.()
          }}
          onPause={() => setPlaying(false)}
          onEnded={() => setPlaying(false)}
          onError={() => setFailedPlayback(true)}
        />}
        <button
          type="button"
          className="play-button"
          disabled={!source}
          aria-label={playing ? 'Pause voice audio' : 'Play voice audio'}
          onClick={() => {
            const player = audio.current
            if (!player) return
            if (player.paused) void player.play().catch(() => setFailedPlayback(true))
            else player.pause()
          }}
        >
          {playing ? <Pause size={17} /> : <Play size={16} fill="currentColor" />}
        </button>
      </div>
      {message && <p className="voice-text">“{message.text}”</p>}
      {loading && <p className="voice-note"><AudioLines size={13} /> Preparing voice audio…</p>}
      {!loading && (failure || failedPlayback) && (
        <p className="voice-note" role="status">
          {failure || 'The browser could not play this audio.'}
          {retry && <button className="text-action" type="button" onClick={retry}><RotateCw size={12} /> Retry</button>}
        </p>
      )}
      {!loading && !failure && message && (message.simulated || !source) && (
        <p className="voice-note">
          <AudioLines size={13} />
          {unavailable}
        </p>
      )}
    </article>
  )
}

function OrderExperience({ order, onReply, reply }: {
  order: Order
  onReply: (id: string, reply: Reply) => void
  reply: Reply | undefined
}) {
  const [prompt, setPrompt] = useState<Voice>()
  const [update, setUpdate] = useState<Voice>()
  const [promptError, setPromptError] = useState('')
  const [updateError, setUpdateError] = useState('')
  const [promptRetry, setPromptRetry] = useState(0)
  const [updateRetry, setUpdateRetry] = useState(0)
  const [sending, setSending] = useState(false)
  const [replyError, setReplyError] = useState('')
  const activeSend = useRef(false)
  const spokenUpdate = order.spoken_update
  const queuedUpdateText = spokenUpdate?.text
  const updateCopy = queuedUpdateText ?? (order.status === 'rerouted' ? updateText(order) : undefined)
  const updateKey = updateCopy && `${order.id}:${updateCopy}`
  const canReply = order.status === 'awaiting_confirm'
  const showPrompt = order.needs_voice_confirm && (canReply || prompt || confirmationRequests.has(order.id))
  const fetchPrompt = showPrompt && (!updateCopy || confirmationRequests.has(order.id))
  const shouldFetchUpdate = Boolean(updateKey && !mockMode && !spokenUpdate?.audio_wav_base64
    && (!spokenUpdate?.played || updateRequests.has(updateKey)))

  useEffect(() => {
    if (!fetchPrompt) return
    let active = true
    void getVoice(confirmationRequests, order.id, order.id).then(
      (voice) => {
        if (active) setPrompt(voice)
      },
      (error: unknown) => {
        if (active) setPromptError(errorText(error))
      },
    )
    return () => { active = false }
  }, [order.id, fetchPrompt, promptRetry])

  useEffect(() => {
    if (!shouldFetchUpdate || !updateKey || update) return
    let active = true
    // The backend serves a queued update once through the same endpoint as the confirmation prompt.
    const request = Promise.resolve(confirmationRequests.get(order.id)).catch(() => undefined)
      .then(() => getVoice(updateRequests, updateKey, order.id))
    void request.then(
      (voice) => {
        if (!active) return
        if (queuedUpdateText && voice.text !== queuedUpdateText) {
          setUpdateError('The delivery update audio is unavailable.')
          return
        }
        setUpdate(voice)
      },
      (error: unknown) => {
        if (active) setUpdateError(errorText(error))
      },
    )
    return () => { active = false }
  }, [order.id, queuedUpdateText, shouldFetchUpdate, update, updateKey, updateRetry])

  const answer = useCallback(async (send: () => Promise<Reply>) => {
    if (activeSend.current) return
    activeSend.current = true
    setSending(true)
    setReplyError('')
    try {
      const result = await send()
      onReply(order.id, result)
      if (!result.transcript.trim()) setReplyError('No transcript is available. Use a quick reply.')
    } catch (error) {
      setReplyError(errorText(error))
    } finally {
      activeSend.current = false
      setSending(false)
    }
  }, [onReply, order.id])

  return (
    <div className="phone-scroll">
      <BuyerIdentity order={order} />

      {showPrompt && (fetchPrompt || prompt) && <VoiceCard
        title={canReply ? 'Pakka is calling' : 'Pakka voice call'}
        message={prompt}
        loading={!prompt && !promptError}
        failure={promptError}
        retry={() => { setPromptError(''); setPromptRetry((attempt) => attempt + 1) }}
      />}

      {canReply && (
        <div className="reply-controls">
          <RecordButton disabled={sending} onError={setReplyError} onSend={(wav) => answer(() => api.voiceReply(order.id, wav))} />
          <div className="quick-divider"><span /> Or reply by text <span /></div>
          <div className="quick-replies">
            {responses.map((text) => (
              <button key={text} type="button" disabled={sending} onClick={() => void answer(() => api.replyText(order.id, text))}>{text}</button>
            ))}
          </div>
        </div>
      )}
      {replyError && <p className="reply-error" role="status"><CircleHelp size={14} /> {replyError}</p>}
      {reply && <ReplyResult reply={reply} />}

      {updateCopy && (
        <VoiceCard
          key={updateKey}
          title="A new courier"
          update
          message={update ?? spokenUpdate ?? { text: updateCopy }}
          loading={shouldFetchUpdate && !update && !updateError}
          failure={updateError}
          retry={shouldFetchUpdate ? () => { setUpdateError(''); setUpdateRetry((attempt) => attempt + 1) } : undefined}
        />
      )}
      {!showPrompt && !updateCopy && <div className="phone-empty compact"><Package size={24} /><p>There’s no voice call for this order.</p></div>}

      <BuyerFooter order={order} />
    </div>
  )
}

function BuyerIdentity({ order }: { order: Order }) {
  return (
    <div className="buyer-identity">
      <span className="buyer-mark"><Package size={17} strokeWidth={1.7} /></span>
      <div>
        <strong>{order.buyer_name}</strong>
        <p>{order.city} <span aria-hidden="true">·</span> {rupees.format(order.value)} {order.cod ? 'COD' : 'prepaid'}</p>
      </div>
      <span className="buyer-id mono">{order.id}</span>
    </div>
  )
}

function ReplyResult({ reply }: { reply: Reply | RecordedReply }) {
  const reduce = useReducedMotion()
  return (
    <motion.div
      className="reply-result"
      data-tour="reply"
      role="status"
      initial={reduce ? false : { opacity: 0, y: 5 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: 'spring', stiffness: 380, damping: 32 }}
    >
      {reply.intent === 'confirm' ? <Check size={16} /> : <Mic size={15} />}
      <div><span>Buyer transcript{'source' in reply && ` · ${reply.source === 'claude' ? 'Claude' : reply.source}`}</span><strong>{reply.transcript ? `“${reply.transcript}”` : 'No transcript'}</strong></div>
      <span className="intent mono">{reply.intent}</span>
    </motion.div>
  )
}

function BuyerFooter({ order }: { order: Order }) {
  return (
    <div className="buyer-footer">
      <StatusChip status={order.status} />
      <span><ArrowRight size={12} /> {courierNames[order.courier] ?? order.courier}</span>
    </div>
  )
}

type ReplayPhone = {
  kind: 'replay'
  prompt?: ReplayClip
  update?: ReplayClip
  reply?: RecordedReply
  pause: () => void
  demoPlaying: boolean
}

type LivePhone = {
  kind: 'live'
  reply?: Reply
  onReply: (id: string, reply: Reply) => void
}

export function BuyerPhone({ order, experience }: {
  order: Order | undefined
  experience: LivePhone | ReplayPhone
}) {
  const replay = experience.kind === 'replay'
  const label = replay ? 'Recorded buyer' : mockMode ? 'Simulated buyer' : 'Buyer preview'
  const update = replay && (experience.update ?? (order?.spoken_update ? {
    text: order.spoken_update.text,
    queued: true,
  } : undefined))
  const updateCard = replay && update && (
    <VoiceCard title="A new courier" message={update} update recorded demoPlaying={experience.demoPlaying} onPlay={experience.pause} />
  )

  return (
    <aside className="buyer-stage" aria-labelledby="buyer-heading">
      <header className="stage-heading">
        <div>
          <p><Smartphone size={15} /> Buyer view</p>
          <h2 id="buyer-heading">Across<span>the line.</span></h2>
        </div>
        <span className="stage-signal" title={label} aria-hidden="true"><Radio size={15} /></span>
      </header>
      <div className="device">
        <div className="device-screen">
          <div className="device-top" aria-hidden="true"><span /></div>
          <div className="device-brand"><div className="brand-mark small"><Package size={15} /></div><strong>Pakka</strong><span>Jaipur Kurta Co.</span></div>
          {order && experience.kind === 'live' && <OrderExperience key={order.id} order={order} reply={experience.reply} onReply={experience.onReply} />}
          {order && experience.kind === 'replay' && (
            <div className="phone-scroll" key={order.id}>
              <BuyerIdentity order={order} />
              {experience.update && updateCard}
              {experience.prompt && <VoiceCard title="Pakka voice call" message={experience.prompt} recorded demoPlaying={experience.demoPlaying} onPlay={experience.pause} />}
              {experience.reply && <ReplyResult reply={experience.reply} />}
              {!experience.update && updateCard}
              <BuyerFooter order={order} />
            </div>
          )}
          {!order && <div className="phone-empty"><PhoneIncoming size={28} /><p>No order selected.</p><span>{replay ? 'The recorded order will appear here.' : 'Choose an order to see the buyer’s call.'}</span></div>}
          <div className="device-bottom" aria-hidden="true"><span /></div>
        </div>
      </div>
      <div className="stage-footer"><span className="state-dot" /><BlurSwap text={label} /></div>
    </aside>
  )
}
