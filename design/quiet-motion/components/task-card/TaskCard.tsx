import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { ArrowRight, Check, Moon, Sun } from 'lucide-react'
import { BlurSwap } from '../blur-swap/BlurSwap'
import { ProgressRing } from '../progress-ring/ProgressRing'
import { StatusChip, StatusOptions, type Status } from '../status-select/StatusSelect'
import { Avatar, AvatarStack, people } from '../avatar-stack/AvatarStack'

type Item = { label: string; owner: string; done: boolean }

const initialItems: Item[] = [
  { label: 'Welcome screen', owner: 'Jon', done: true },
  { label: 'Workspace setup', owner: 'Mara', done: true },
  { label: 'Invite teammates', owner: 'Mara', done: false },
  { label: 'First-run checklist', owner: 'Priya', done: false },
  { label: 'Lifecycle emails', owner: 'Jon', done: false },
]

const layoutSpring = { type: 'spring', stiffness: 380, damping: 32 } as const

/** A collapsible task card: ring, inline status picker, checklist, and a footer that narrates what you hover. */
export function TaskCard({ dark = false, demo = false }: { dark?: boolean; demo?: boolean }) {
  const [open, setOpen] = useState(false)
  const [items, setItems] = useState(initialItems)
  const [status, setStatus] = useState<Status>('progress')
  const [statusOpen, setStatusOpen] = useState(false)
  const [hovered, setHovered] = useState<number | null>(null)
  const [person, setPerson] = useState<string | null>(null)
  const touched = useRef(false)

  const doneCount = items.filter((i) => i.done).length
  const left = items.length - doneCount

  function toggle(k: number) {
    const next = items.map((it, j) => (j === k ? { ...it, done: !it.done } : it))
    setItems(next)
    const all = next.every((i) => i.done)
    if (all) setStatus('done')
    else if (status === 'done') setStatus('progress')
  }

  // Self-playing script for the gallery; stops for good once a real pointer arrives.
  useEffect(() => {
    if (!demo) return
    const script: (() => void)[] = [
      () => setOpen(true),
      () => setHovered(2),
      () => (setItems((s) => s.map((it, j) => (j === 2 ? { ...it, done: true } : it))), setHovered(3)),
      () => setItems((s) => s.map((it, j) => (j === 3 ? { ...it, done: true } : it))),
      () => (setHovered(null), setStatusOpen(true)),
      () => (setStatus('review'), setStatusOpen(false)),
      () => setPerson('Mara'),
      () => setPerson(null),
      () => setItems(initialItems),
      () => (setStatus('progress'), setOpen(false)),
    ]
    let step = 0
    const t = setInterval(() => {
      if (touched.current) return clearInterval(t)
      script[step % script.length]()
      step++
    }, 1100)
    return () => clearInterval(t)
  }, [demo])

  const footer = (() => {
    if (person) {
      const mine = items.filter((i) => i.owner === person)
      return `${person} · ${mine.filter((i) => i.done).length} of ${mine.length} done`
    }
    if (hovered !== null) {
      const it = items[hovered]
      return it.done ? `Done by ${it.owner}` : `Assigned to ${it.owner}`
    }
    return left ? `${left} left` : 'All done'
  })()

  const c = dark
    ? { card: 'bg-[#1b1b1b] border-[#2e2e2e] text-[#f5f5f5]', muted: 'text-[#8b8b8b]', faint: 'text-white/35', row: 'bg-white/[.05]', foot: 'bg-[#171717] border-[#2a2a2a]', check: 'text-[#1b1b1b] bg-[#f5f5f5]' }
    : { card: 'bg-white border-[#e7e7e5] text-[#111]', muted: 'text-[#8a8a87]', faint: 'text-black/30', row: 'bg-black/[.035]', foot: 'bg-[#fafaf9] border-[#efefed]', check: 'text-white bg-[#111]' }

  return (
    <motion.div
      layout
      transition={layoutSpring}
      onPointerEnter={() => (touched.current = true)}
      className={`w-[300px] overflow-hidden rounded-[14px] border font-sans shadow-[0_1px_2px_rgba(0,0,0,.04),0_4px_16px_rgba(0,0,0,.05)] ${c.card}`}
    >
      <motion.div layout="position" className="flex flex-wrap items-start gap-x-2.5 px-3 pt-3 pb-3">
        <button onClick={() => setOpen((o) => !o)} className="mt-0.5 cursor-pointer">
          <ProgressRing value={doneCount / items.length} label={String(doneCount)} />
        </button>
        <div className="min-w-0 flex-1">
          <button onClick={() => setOpen((o) => !o)} className="block cursor-pointer text-[13px] font-medium">
            Onboarding flow
          </button>
          <div className="mt-1 flex items-center gap-2">
            <button onClick={() => setStatusOpen((o) => !o)} className="cursor-pointer">
              <StatusChip status={status} dark={dark} />
            </button>
            <span className={`text-[11px] ${c.muted}`}>Due Oct 24</span>
          </div>
        </div>
        <AvatarStack dark={dark} focused={person} onFocus={setPerson} />
        <StatusOptions dark={dark} open={statusOpen} value={status} onPick={(s) => (setStatus(s), setStatusOpen(false))} />
      </motion.div>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            key="body"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={layoutSpring}
          >
            <ul className="px-1.5 pb-1.5" onMouseLeave={() => setHovered(null)}>
              {items.map((it, k) => {
                const dim = person && it.owner !== person
                const owner = people.find((p) => p.id === it.owner)!
                return (
                  <motion.li
                    key={it.label}
                    onMouseEnter={() => setHovered(k)}
                    onClick={() => toggle(k)}
                    initial={{ opacity: 0, y: 4, filter: 'blur(3px)' }}
                    animate={{ opacity: dim ? 0.3 : 1, y: 0, filter: 'blur(0px)' }}
                    transition={{ delay: k * 0.03 }}
                    className="relative flex h-8 cursor-pointer items-center gap-2.5 rounded-[8px] px-1.5 text-[12px] font-medium"
                  >
                    {hovered === k && <motion.span layoutId={`row-${dark}`} className={`absolute inset-0 rounded-[8px] ${c.row}`} transition={layoutSpring} />}
                    <span className="relative grid size-3.5 place-items-center">
                      <span className={`absolute inset-0 rounded-full border-[1.5px] ${dark ? 'border-white/30' : 'border-black/25'}`} />
                      <AnimatePresence initial={false}>
                        {it.done && (
                          <motion.span
                            className={`absolute inset-0 grid place-items-center rounded-full ${c.check}`}
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            exit={{ scale: 0 }}
                            transition={{ type: 'spring', stiffness: 600, damping: 18 }}
                          >
                            <Check size={9} strokeWidth={3.5} />
                          </motion.span>
                        )}
                      </AnimatePresence>
                    </span>
                    <motion.span className="relative" animate={{ opacity: it.done ? 0.5 : 1 }}>
                      {it.label}
                    </motion.span>
                    <AnimatePresence>
                      {hovered === k && (
                        <motion.span
                          className="relative ml-auto"
                          initial={{ opacity: 0, scale: 0.6 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0, scale: 0.6 }}
                          transition={{ type: 'spring', stiffness: 520, damping: 34 }}
                        >
                          <Avatar person={owner} dark={dark} size={14} />
                        </motion.span>
                      )}
                    </AnimatePresence>
                  </motion.li>
                )
              })}
            </ul>
            <div className={`flex h-9 items-center justify-between border-t px-3 text-[11px] ${c.foot}`}>
              <BlurSwap text={footer} className={c.muted} />
              <span className="flex items-center gap-1 font-medium">
                Open <ArrowRight size={11} strokeWidth={2.5} />
              </span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

export default function TaskCardDemo() {
  const [dark, setDark] = useState(false)
  return (
    <div className={`relative grid min-h-[360px] w-[420px] place-items-start justify-center rounded-[14px] pt-10 transition-colors duration-500 ${dark ? 'bg-[#121212]' : 'bg-[#f4f4f3]'}`}>
      <button
        onClick={() => setDark((d) => !d)}
        className={`absolute top-3 right-3 grid size-7 cursor-pointer place-items-center rounded-full ${dark ? 'bg-white/10 text-white' : 'bg-black/5 text-[#111]'}`}
        aria-label="Toggle theme"
      >
        {dark ? <Sun size={13} /> : <Moon size={13} />}
      </button>
      <TaskCard dark={dark} demo />
    </div>
  )
}
