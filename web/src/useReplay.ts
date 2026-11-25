import { useEffect, useRef, useState } from 'react'
import type { ReplayRun, ReplayStepId } from './replay'

// The shortest a step can last; steps with narration last as long as their clip.
export const stepDurations: Record<ReplayStepId, number> = {
  start: 3000, blocked: 3000, order: 4500, call: 1500, reply: 4000, jam: 3500, crash: 4500, priority: 3000, reroute: 6000, update: 1500, end: 3000,
}
type Position = { index: number; elapsed: number; audioOffset: number }

const BLOCKED = 'Your browser blocked the sound. Press Play to start the demo with sound.'

export function useReplay(run: ReplayRun) {
  const [position, setPosition] = useState<Position>({ index: 0, elapsed: 0, audioOffset: 0 })
  const [playing, setPlaying] = useState(false)
  const [audioError, setAudioError] = useState('')
  const audio = useRef<AudioContext | null>(null)
  const buffers = useRef(new Map<string, Promise<AudioBuffer>>())
  const lengths = useRef(new Map<string, number>())
  const stepStartedAt = useRef(0)
  const frame = run.frames[position.index]
  const finished = position.index === run.frames.length - 1

  const [, setLoaded] = useState(0)

  // A suspended context can decode before the first click, so the timeline knows its length up front.
  useEffect(() => {
    try {
      const context = audio.current ?? new AudioContext()
      audio.current = context
      for (const { audio: src } of run.frames) {
        if (src) void getBuffer(context, src).then(() => setLoaded((count) => count + 1), () => {})
      }
    } catch { /* play() reports it */ }
  }, [run])

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
        const decoded = await context.decodeAudioData(await response.arrayBuffer())
        lengths.current.set(src, decoded.duration * 1000)
        return decoded
      }).catch((error: unknown) => {
        buffers.current.delete(src)
        throw error
      })
      buffers.current.set(src, buffer)
    }
    return buffer
  }

  // How long step `index` lasts, once its clip is decoded.
  function stepLength(index: number) {
    const step = run.frames[index]
    return Math.max(stepDurations[step.id], (step.audio && lengths.current.get(step.audio)) || 0)
  }

  const startOf = (index: number) => run.frames.slice(0, index).reduce((sum, _, i) => sum + stepLength(i), 0)
  const total = () => startOf(run.frames.length)
  const now = () => startOf(position.index) + position.elapsed + (playing ? performance.now() - stepStartedAt.current : 0)

  // The demo only runs with sound: start it once the browser lets the audio context run.
  function play(restart = false) {
    setAudioError('')
    let context: AudioContext
    try {
      context = audio.current ?? new AudioContext()
      audio.current = context
      // Unlock the audio context inside the click, before any timed step or fetch.
      const unlock = context.createBufferSource()
      unlock.buffer = context.createBuffer(1, 1, context.sampleRate)
      unlock.connect(context.destination)
      unlock.start()
    } catch {
      setAudioError('This browser cannot play the demo audio. Try Chrome, Edge, Firefox or Safari.')
      return
    }
    for (const { audio: src } of run.frames) {
      if (src) void getBuffer(context, src).catch(() => {})
    }
    const ended = finished && position.elapsed >= stepLength(position.index) - 100
    if (restart || ended) setPosition({ index: 0, elapsed: 0, audioOffset: 0 })
    void context.resume().catch(() => {}).then(() => {
      if (context.state === 'running') setPlaying(true)
      else setAudioError(BLOCKED)
    })
  }

  function pause() {
    setPlaying(false)
  }

  function jump(index: number) {
    pause()
    setAudioError('')
    setPosition({ index, elapsed: 0, audioOffset: 0 })
  }

  // Moves to a point on the whole demo's timeline, keeping play or pause as it is.
  function seekTo(ms: number) {
    let target = Math.min(Math.max(0, ms), total() - 1)
    let index = 0
    while (index < run.frames.length - 1 && target >= stepLength(index)) {
      target -= stepLength(index)
      index += 1
    }
    setPosition({ index, elapsed: target, audioOffset: target / 1000 })
  }

  const seek = (delta: number) => seekTo(now() + delta)

  useEffect(() => {
    if (!playing) return

    stepStartedAt.current = performance.now()
    const startedAt = stepStartedAt.current
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

    // Never carry on silently: stop and ask for Play again.
    function audioFailed(message: string) {
      if (!active) return
      setAudioError(message)
      setPlaying(false)
    }

    if (frame.audio && context) {
      audioTimer = window.setTimeout(() => audioFailed('The demo audio is taking too long to load. Press Play to try again.'), 12000)
      void getBuffer(context, frame.audio).then((buffer) => {
        if (!active || audioDone) return
        window.clearTimeout(audioTimer)
        if (position.audioOffset >= buffer.duration) {
          audioDone = true
          advance()
          return
        }
        if (context.state !== 'running') {
          audioFailed(BLOCKED)
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
      }).catch(() => audioFailed('The demo audio could not load. Press Play to try again.'))
    } else if (frame.audio) {
      audioFailed(BLOCKED)
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

  return { frame, index: position.index, position, playing, finished, audioError, play, pause, jump, seek, seekTo, now, total }
}
