import { Mic, Square } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { errorText } from '../api'
import { toWav } from '../audio'
import { BlurSwap } from './MotionText'

type Recording = {
  cancelled: boolean
  recorder?: MediaRecorder
  release: () => void
}

function stop(session: Recording) {
  if (session.recorder?.state === 'recording') session.recorder.stop()
  else session.cancelled = true
}

export function RecordButton({ disabled, onSend, onError }: {
  disabled: boolean
  onSend: (wav: Blob) => Promise<void>
  onError: (message: string) => void
}) {
  const [phase, setPhase] = useState<'idle' | 'asking' | 'recording' | 'encoding'>('idle')
  const active = useRef<Recording | null>(null)

  useEffect(() => () => {
    const session = active.current
    if (session) {
      session.cancelled = true
      stop(session)
      session.release()
      active.current = null
    }
  }, [])

  function finish(cancelled = false) {
    const session = active.current
    if (!session) return
    if (cancelled) session.cancelled = true
    stop(session)
  }

  async function start() {
    if (disabled || active.current) return
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') {
      onError('Microphone recording needs a supported browser on localhost or HTTPS.')
      return
    }

    const session: Recording = { cancelled: false, release: () => {} }
    active.current = session
    onError('')
    setPhase('asking')
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      session.release = () => stream.getTracks().forEach((track) => track.stop())
      if (session.cancelled) {
        session.release()
        if (active.current === session) {
          active.current = null
          setPhase('idle')
          onError('Microphone is ready. Hold again to record.')
        }
        return
      }

      const recorder = new MediaRecorder(stream)
      const chunks: Blob[] = []
      session.recorder = recorder
      recorder.ondataavailable = (event) => chunks.push(event.data)
      recorder.onerror = () => {
        if (active.current !== session) return
        session.cancelled = true
        session.release()
        active.current = null
        setPhase('idle')
        onError('Could not record this reply. Try again or use a quick reply.')
      }
      recorder.onstop = async () => {
        session.release()
        if (active.current !== session) return
        try {
          if (!session.cancelled) {
            setPhase('encoding')
            const wav = await toWav(new Blob(chunks, { type: recorder.mimeType }))
            if (active.current === session) await onSend(wav)
          }
        } catch (error) {
          if (active.current === session) onError(errorText(error))
        } finally {
          if (active.current === session) {
            active.current = null
            setPhase('idle')
          }
        }
      }
      recorder.start()
      setPhase('recording')
    } catch (error) {
      session.release()
      if (active.current === session) {
        active.current = null
        setPhase('idle')
        onError(error instanceof DOMException && error.name === 'NotAllowedError'
          ? 'Microphone permission is off. Allow access or send a quick reply.'
          : errorText(error))
      }
    }
  }

  const label = {
    idle: 'Hold to record',
    asking: 'Waiting for microphone…',
    recording: 'Release to send',
    encoding: 'Sending voice reply…',
  }[phase]

  return (
    <button
      type="button"
      className={`record-button ${phase === 'recording' ? 'is-recording' : ''}`}
      disabled={phase === 'encoding' || (disabled && phase === 'idle')}
      onPointerDown={(event) => {
        if (event.button !== 0 || !event.isPrimary || phase !== 'idle') return
        event.currentTarget.setPointerCapture(event.pointerId)
        void start()
      }}
      onPointerUp={() => finish()}
      onPointerCancel={() => finish(true)}
      onLostPointerCapture={() => {
        if (active.current?.recorder?.state === 'recording') finish(true)
      }}
      onKeyDown={(event) => {
        if (event.key !== ' ' && event.key !== 'Enter') return
        event.preventDefault()
        if (!event.repeat && phase === 'idle') void start()
      }}
      onKeyUp={(event) => {
        if (event.key !== ' ' && event.key !== 'Enter') return
        event.preventDefault()
        finish()
      }}
      onBlur={() => {
        if (phase === 'recording' || phase === 'asking') finish(true)
      }}
    >
      {phase === 'recording' ? <Square size={15} /> : <Mic size={16} />}
      <BlurSwap text={label} />
    </button>
  )
}
