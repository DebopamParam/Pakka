import { ArrowUpRight, AudioLines, Code2, Image, Pause, Play, RotateCcw, Terminal, X } from 'lucide-react'
import { useLayoutEffect, useRef } from 'react'
import type { ProofImage, ReplayClip, ReplayRun, ReplayStepId } from '../replay'
import type { useReplay } from '../useReplay'

const steps: Record<ReplayStepId, { name: string; actor: string }> = {
  start: { name: 'Start', actor: 'Pakka' },
  order: { name: 'Order', actor: 'Flagsmith' },
  call: { name: 'Call', actor: 'Sarvam AI' },
  reply: { name: 'Reply', actor: 'Buyer' },
  jam: { name: 'Jam', actor: 'Courier 1' },
  crash: { name: 'Crash', actor: 'Kubernetes' },
  reroute: { name: 'Reroute', actor: 'NudgeBee + Flagsmith' },
  update: { name: 'Update', actor: 'Sarvam AI' },
  end: { name: 'Finish', actor: 'Pakka' },
}

const dateInIndia = new Intl.DateTimeFormat('en-IN', {
  dateStyle: 'medium', timeStyle: 'short', timeZone: 'Asia/Kolkata',
})

export function ReplayControls({ run, playback }: { run: ReplayRun; playback: ReturnType<typeof useReplay> }) {
  const { frame, index, playing, finished, audioError, play, pause, jump } = playback
  const actor = frame.id === 'reply' && run.reply?.source === 'claude' ? 'Claude' : steps[frame.id].actor

  return (
    <section className="replay-controls" aria-label="Recorded demo">
      <div className="replay-actions">
        <button type="button" className="new-order replay-play" onClick={() => playing ? pause() : play()}>
          {playing ? <Pause size={15} /> : <Play size={15} fill="currentColor" />}
          {playing ? 'Pause demo' : finished ? 'Replay demo' : 'Play the demo'}
        </button>
        <button type="button" className="replay-restart" aria-label="Restart demo" title="Restart demo" onClick={() => play(true)}>
          <RotateCcw size={16} />
        </button>
      </div>
      <div className="replay-position">
        <p className="replay-caption" role="status"><strong>{actor}</strong><span>{frame.label}</span></p>
        <ol className="replay-steps" aria-label="Recorded steps">
          {run.frames.map((step, number) => (
            <li key={step.id}>
              <button type="button" aria-current={index === number ? 'step' : undefined}
                className={number < index ? 'step-complete' : undefined} onClick={() => jump(number)}>
                {steps[step.id].name}
              </button>
            </li>
          ))}
        </ol>
      </div>
      <div className="replay-recording">
        <p>Replay of a real run <span aria-hidden="true">·</span> recorded <time dateTime={run.recordedAt}>{dateInIndia.format(new Date(run.recordedAt))} IST</time></p>
        <a href="https://github.com/DebopamParam/Pakka" target="_blank" rel="noreferrer">GitHub repo <ArrowUpRight size={13} /></a>
      </div>
      {audioError && <p className="replay-audio-error" role="status">{audioError}</p>}
    </section>
  )
}

const sponsors = [
  { id: 'flagsmith', name: 'Flagsmith', label: 'COD and routing rules', icon: Image },
  { id: 'nudgebee', name: 'NudgeBee', label: 'Incident and approval', icon: Image },
  { id: 'sarvam', name: 'Sarvam AI', label: 'Hinglish voice clips', icon: AudioLines },
  { id: 'claude', name: 'Claude', label: 'Buyer reply intent', icon: Code2 },
  { id: 'kubernetes', name: 'Kubernetes', label: 'Pod status', icon: Terminal },
]

function sponsorId(name: string) {
  const id = name.toLowerCase().replace(/[^a-z0-9]/g, '')
  return id === 'sarvamai' ? 'sarvam' : id
}

function ClipProof({ title, clip }: { title: string; clip: ReplayClip }) {
  return (
    <section className="proof-evidence">
      <h3>{title}</h3>
      <p lang="hi-Latn">{clip.text}</p>
      {clip.src && <audio controls preload="none" src={clip.src} aria-label={title} />}
      {clip.simulated && <p>Simulated voice in this recording.</p>}
      {!clip.src && !clip.simulated && <p>Recorded audio unavailable.</p>}
    </section>
  )
}

export function ReplayProof({ run, images, selected, onSelect, hidden }: {
  run: ReplayRun
  images: ProofImage[]
  selected: string
  onSelect: (id: string) => void
  hidden: boolean
}) {
  const dialog = useRef<HTMLDialogElement>(null)
  const cards = new Map<string, typeof sponsors[number] & { images: ProofImage[] }>(
    sponsors.map((sponsor) => [sponsor.id, { ...sponsor, images: [] }]),
  )
  for (const image of images) {
    const id = sponsorId(image.sponsor)
    const card = cards.get(id)
    if (card) card.images.push(image)
    else cards.set(id, { id, name: image.sponsor, label: 'Recorded screenshot', icon: Image, images: [image] })
  }
  const card = cards.get(sponsorId(selected))

  useLayoutEffect(() => {
    if (selected && !dialog.current?.open) dialog.current?.showModal()
  }, [selected])

  return (
    <section className={`proof-strip${hidden ? ' proof-strip-hidden' : ''}`} aria-labelledby="proof-heading">
      <h2 id="proof-heading">Proof</h2>
      <div className="proof-cards">
        {[...cards.values()].map(({ id, name, label, icon: Icon, images: screenshots }) => (
          <button key={id} type="button" className="proof-card" aria-haspopup="dialog" onClick={() => onSelect(id)}>
            <span className="proof-thumb">
              {screenshots[0] ? <img src={screenshots[0].src} alt="" /> : <Icon size={16} strokeWidth={1.7} />}
            </span>
            <span><strong>{name}</strong><span>{label}</span></span>
          </button>
        ))}
      </div>
      <dialog ref={dialog} className="proof-dialog" aria-labelledby="proof-title" onClose={() => onSelect('')}
        onClick={(event) => { if (event.target === event.currentTarget) event.currentTarget.close() }}>
        {card && <>
          <header>
            <h2 id="proof-title">{card.name}</h2>
            <form method="dialog"><button type="submit" aria-label="Close proof"><X size={20} /></button></form>
          </header>
          <div className="proof-dialog-body">
            {card.id === 'kubernetes' && (
              <div className="proof-pods">
                <section><h3>During the crash</h3><pre>{run.proofs.pods_crash || 'Pod output unavailable.'}</pre></section>
                <section><h3>After rerouting</h3><pre>{run.proofs.pods_after || 'Pod output unavailable.'}</pre></section>
              </div>
            )}
            {card.id === 'sarvam' && (
              <>
                <ClipProof title="Confirmation call" clip={run.confirm} />
                <ClipProof title="Courier update" clip={run.update} />
              </>
            )}
            {card.id === 'claude' && (
              run.reply ? <section className="proof-evidence">
                <h3>Typed buyer reply</h3>
                <p lang="hi-Latn">“{run.reply.transcript}”</p>
                <dl className="mono"><dt>intent</dt><dd>{run.reply.intent}</dd><dt>intent_source</dt><dd>{run.reply.source}</dd></dl>
              </section> : <p>Recorded reply unavailable.</p>
            )}
            {card.images.map(({ src, title }) => (
              <figure key={src}><figcaption>{title}</figcaption><img src={src} alt={title} /></figure>
            ))}
            {card.images.length === 0 && (card.id === 'flagsmith' || card.id === 'nudgebee') && <p>Screenshots unavailable.</p>}
          </div>
        </>}
      </dialog>
    </section>
  )
}
