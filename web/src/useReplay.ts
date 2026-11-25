import { useEffect, useRef, useState } from 'react'
import type { ReplayRun, ReplayStepId } from './replay'

// Audio steps also wait for their clip to end.
export const stepDurations: Record<ReplayStepId, number> = {
  start: 3000, order: 4500, call: 1500, reply: 4000, jam: 3500, crash: 4500, reroute: 6000, update: 1500, end: 3000,
}
type Position = { index: number; elapsed: number; audioOffset: number }

export function useReplay(run: ReplayRun) {
  const [position, setPosition] = useState<Position>({ index: 0, elapsed: 0, audioOffset: 0 })
  const [playing, setPlaying] = useState(false)
  const [audioError, setAudioError] = useState('')
  const audio = useRef<AudioContext | null>(null)
  const buffers = useRef(new Map<string, Promise<AudioBuffer>>())
  const frame = run.frames[position.index]
  const finished = position.index === run.frames.length - 1

  useEffect(() => () => {
    void audio.current?.close().catch(() => {})
    audio.current = null
    buffers.current.clear()
  }, [])

  function getBuffer(context: AudioContext, src: string) {
    let buffer = buffers.current.get(src)
    if (!buffer) {
      buffer = fetch(src, { signal: AbortSignal.timeout(10000) }).then(async (response) => {
        if (!response.ok) throw new Error('Recorded audio unavailable')
        return context.decodeAudioData(await response.arrayBuffer())
      }).catch((error: unknown) => {
        buffers.current.delete(src)
        throw error
      })
      buffers.current.set(src, buffer)
    }
    return buffer
  }

  function play(restart = false) {
    setAudioError('')
    try {
      const context = audio.current ?? new AudioContext()
      audio.current = context
      // Unlock the audio context inside the click, before any timed step or fetch.
      const unlock = context.createBufferSource()
      unlock.buffer = context.createBuffer(1, 1, context.sampleRate)
      unlock.connect(context.destination)
      unlock.start()
      void context.resume().catch(() => {})
      for (const { audio: src } of run.frames) {
        if (src) void getBuffer(context, src).catch(() => {})
      }
    } catch {
      setAudioError('Use the clip controls to hear recorded audio.')
    }
    if (restart || finished) setPosition({ index: 0, elapsed: 0, audioOffset: 0 })
    setPlaying(true)
  }

  function pause() {
    setPlaying(false)
  }

  function jump(index: number) {
    pause()
    setAudioError('')
    setPosition({ index, elapsed: 0, audioOffset: 0 })
  }

  useEffect(() => {
    if (!playing) return

    const startedAt = performance.now()
    const context = audio.current
    let active = true
    let timeDone = false
    let audioDone = !frame.audio
    let source: AudioBufferSourceNode | undefined
    let audioStartedAt = 0
    let audioTimer: number | undefined
    function advance() {
      if (!active || !timeDone || !audioDone) return
      if (finished) {
        setPlaying(false)
        return
      }
      setPosition({ index: position.index + 1, elapsed: 0, audioOffset: 0 })
    }
    const timer = window.setTimeout(() => {
      timeDone = true
      advance()
    }, Math.max(0, stepDurations[frame.id] - position.elapsed))

    function audioFailed() {
      if (!active) return
      setAudioError('Autoplay audio is unavailable. You can play the clip in Buyer view or Proof.')
      audioDone = true
      advance()
    }

    if (frame.audio && context) {
      audioTimer = window.setTimeout(audioFailed, 12000)
      void getBuffer(context, frame.audio).then((buffer) => {
        if (!active || audioDone) return
        window.clearTimeout(audioTimer)
        if (position.audioOffset >= buffer.duration) {
          audioDone = true
          advance()
          return
        }
        if (context.state !== 'running') {
          audioFailed()
          return
        }
        source = context.createBufferSource()
        source.buffer = buffer
        source.connect(context.destination)
        source.onended = () => {
          audioDone = true
          position.audioOffset = buffer.duration
          advance()
        }
        audioStartedAt = context.currentTime
        source.start(0, position.audioOffset)
      }).catch(audioFailed)
    } else if (frame.audio) {
      audioFailed()
    }

    return () => {
      active = false
      window.clearTimeout(timer)
      window.clearTimeout(audioTimer)
      position.elapsed += performance.now() - startedAt
      if (context && source) {
        if (!audioDone) position.audioOffset += context.currentTime - audioStartedAt
        source.onended = null
        source.stop()
        source.disconnect()
      }
    }
  }, [playing, finished, frame, position, run.frames.length])

  return { frame, index: position.index, playing, finished, audioError, play, pause, jump }
}
