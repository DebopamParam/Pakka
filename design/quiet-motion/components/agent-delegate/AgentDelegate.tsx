import { memo, useCallback, useEffect, useRef, useState } from 'react'
import { AnimatePresence, LayoutGroup, motion } from 'motion/react'
import { Asterisk, Box, Check, ChevronDown, ChevronRight, Flag, Grip, Plus, CalendarDays } from 'lucide-react'
import { BlurSwap } from '../blur-swap/BlurSwap'

type AgentKind = 'spark' | 'orb' | 'cube'
type Task = {
  id: string
  label: string
  due?: { text: string; today?: boolean }
  flag?: 'red' | 'amber'
  agent: AgentKind
  lines: string[]
  result?: { summary: string; table?: [string, string][]; file?: string }
}

const tasks: Task[] = [
  {
    id: 'tax',
    label: 'Prepare my tax return',
    due: { text: 'Friday' },
    flag: 'red',
    agent: 'spark',
    lines: ['Collecting salary statements', 'Reading bank statements', 'Sorting deductions', 'Filling in the tax return'],
    result: {
      summary: 'Your tax return is ready to review.',
      table: [['Income', '$130,000'], ['Deductions', '$9,860'], ['Refund', '$1,240']],
      file: 'Tax return 2025.xlsx',
    },
  },
  { id: 'power', label: 'Pay the electricity bill', due: { text: 'Today', today: true }, agent: 'orb', lines: ['Finding the bill in Gmail', 'Checking the amount, $84.20', 'Scheduling the payment'] },
  { id: 'subs', label: 'Cancel unused subscriptions', agent: 'cube', lines: ['Checking recurring charges', 'Found 3 unused subscriptions', 'Drafting the cancellations'] },
  { id: 'invoice', label: 'Send the September invoice', flag: 'amber', agent: 'spark', lines: ['Reading the timesheet', 'Creating invoice #1042', 'Drafting the email'] },
  { id: 'vet', label: 'Find a vet for Keos 🐕', due: { text: 'Tomorrow' }, agent: 'orb', lines: ['Searching nearby vets', 'Comparing reviews', 'Booking a Saturday slot'] },
]

const STEP_MS = 1400
const spring = { type: 'spring', stiffness: 380, damping: 32 } as const
const soft = { type: 'spring', stiffness: 260, damping: 28 } as const
// No backdrop blur: the backdrop is a smooth static gradient, so blurring it changes nothing visible and costs a GPU pass per frame while panels move.
const glass = 'bg-[#1c1a18]/90 shadow-[0_18px_50px_-12px_rgba(0,0,0,.6),inset_0_0_0_1px_rgba(255,255,255,.07)]'

function AgentIcon({ kind, working = false, size = 14 }: { kind: AgentKind; working?: boolean; size?: number }) {
  if (kind === 'orb')
    return (
      <motion.span
        className="block rounded-full"
        style={{ width: size - 2, height: size - 2, background: 'radial-gradient(circle at 35% 30%, #c7d2fe, #6366f1 55%, #3730a3)' }}
        animate={working ? { scale: [1, 0.85, 1] } : {}}
        transition={{ repeat: Infinity, duration: 1.4 }}
      />
    )
  if (kind === 'cube') return <Box size={size} strokeWidth={2.2} className="text-white" />
  return (
    <motion.span
      className="block text-[#ff6a3d]"
      animate={working ? { rotate: 360 } : {}}
      transition={{ repeat: Infinity, duration: 3, ease: 'linear' }}
    >
      <Asterisk size={size} strokeWidth={3} />
    </motion.span>
  )
}

/** One to-do row. Memoised: an agent tick re-renders only the rows whose state changed. */
const TaskRow = memo(function TaskRow({
  task: t,
  selected,
  done,
  agentOn,
  order,
  onToggle,
}: {
  task: Task
  selected: boolean
  done: boolean
  agentOn: boolean
  order: number
  onToggle: (id: string) => void
}) {
  return (
    <div
      onClick={() => onToggle(t.id)}
      className={`relative flex h-11 cursor-pointer items-center gap-3 rounded-[12px] px-2.5 transition-colors duration-200 ${selected ? 'bg-white/[.07]' : 'hover:bg-white/[.04]'}`}
    >
      <span
        className={`grid size-[18px] shrink-0 place-items-center rounded-full border-[1.5px] transition-colors duration-200 ${done ? 'border-[#2f80ff] bg-[#2f80ff]' : 'border-white/30'}`}
      >
        <AnimatePresence>
          {done && (
            <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 600, damping: 18 }}>
              <Check size={11} strokeWidth={3.5} />
            </motion.span>
          )}
        </AnimatePresence>
      </span>
      <span className={`relative truncate text-[15px] transition-colors duration-300 ${done ? 'text-[#5aa2ff]' : 'text-white/90'}`}>
        {t.label}
        <motion.span
          className="absolute inset-x-0 top-1/2 h-px origin-left bg-current"
          initial={false}
          animate={{ scaleX: done ? 1 : 0 }}
          transition={{ duration: 0.35, ease: [0.2, 0, 0, 1] }}
        />
      </span>
      <span className="ml-auto flex shrink-0 items-center gap-2">
        {t.due && (
          <span
            className={`flex items-center gap-1 rounded-[6px] px-1.5 py-0.5 text-[11px] ${t.due.today ? 'bg-[#2f80ff]/15 text-[#5aa2ff]' : 'bg-white/[.06] text-white/50'}`}
          >
            <CalendarDays size={10} /> {t.due.text}
          </span>
        )}
        {t.flag && <Flag size={11} fill="currentColor" className={t.flag === 'red' ? 'text-[#ff3b30]' : 'text-[#ffb020]'} />}
        <AnimatePresence>
          {agentOn && (
            <motion.span
              initial={{ scale: 0, width: 0 }}
              animate={{ scale: 1, width: 'auto' }}
              transition={{ type: 'spring', stiffness: 600, damping: 18, delay: order * 0.08 }}
              className="flex items-center gap-2"
            >
              <AgentIcon kind={t.agent} working={!done} size={12} />
              <Grip size={12} className="text-white/30" />
            </motion.span>
          )}
        </AnimatePresence>
      </span>
    </div>
  )
})

/**
 * A to-do list you can hand to agents: select rows, Delegate, and a status pill grows into a live
 * Agents panel; finished tasks check off, strike through and collapse, and the last result unfolds as a card.
 */
export function AgentDelegate({ demo = false }: { demo?: boolean }) {
  const [selected, setSelected] = useState<string[]>([])
  const [delegated, setDelegated] = useState<Task[]>([])
  const [tick, setTick] = useState(-1)
  const [showResult, setShowResult] = useState(false)
  const touched = useRef(false)

  // Finish order follows selection order; each agent's lines spread evenly up to its finish tick.
  const finishAt = (t: Task) => t.lines.length + delegated.indexOf(t)
  const last = delegated.length ? delegated.reduce((a, b) => (finishAt(b) >= finishAt(a) ? b : a)) : undefined
  const end = last ? finishAt(last) : 0
  const working = delegated.filter((t) => tick < finishAt(t))
  const lineOf = (t: Task) => t.lines[Math.min(t.lines.length - 1, Math.floor((Math.max(0, tick) * t.lines.length) / finishAt(t)))]
  const phase = !delegated.length ? 'idle' : tick < 1 ? 'pill' : working.length ? 'panel' : tick <= end + 1 ? 'answered' : 'result'

  useEffect(() => {
    if (!delegated.length) return
    if (tick > end + 1) return setShowResult(true)
    const t = setTimeout(() => setTick((n) => n + 1), STEP_MS)
    return () => clearTimeout(t)
  }, [tick, delegated.length, end])

  function delegate(ids = selected) {
    setDelegated(ids.map((id) => tasks.find((t) => t.id === id)!))
    setSelected([])
    setTick(0)
  }

  function reset() {
    setDelegated([])
    setTick(-1)
    setShowResult(false)
  }

  useEffect(() => {
    if (!demo) return
    const script: [number, () => void][] = [
      [900, () => setSelected(['power'])],
      [500, () => setSelected(['power', 'subs'])],
      [500, () => setSelected(['power', 'subs', 'invoice'])],
      [500, () => setSelected(['power', 'subs', 'invoice', 'tax'])],
      [900, () => delegate(['power', 'subs', 'invoice', 'tax'])],
    ]
    const timers: ReturnType<typeof setTimeout>[] = []
    let at = 0
    for (const [wait, act] of script) {
      at += wait
      timers.push(setTimeout(() => !touched.current && act(), at))
    }
    return () => timers.forEach(clearTimeout)
    // The script restarts each time the demo returns to idle.
  }, [demo, delegated.length === 0])

  useEffect(() => {
    if (!demo || !showResult) return
    const t = setTimeout(() => !touched.current && reset(), 3500)
    return () => clearTimeout(t)
  }, [demo, showResult])

  // Stable, so the memoised rows don't re-render for it; it reads the phase through a ref.
  const idle = useRef(true)
  idle.current = phase === 'idle'
  const toggle = useCallback((id: string) => idle.current && setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id])), [])

  const finished = (t: Task) => delegated.includes(t) && tick >= finishAt(t)
  const gone = (t: Task) => delegated.includes(t) && tick >= finishAt(t) + 1
  const visible = showResult ? tasks.filter((t) => !delegated.includes(t)) : tasks.filter((t) => !gone(t))

  return (
    <div
      onPointerEnter={() => (touched.current = true)}
      className="relative flex min-h-[600px] w-[440px] flex-col items-center gap-3 overflow-hidden rounded-[14px] px-6 pt-8 pb-16 font-sans"
      style={{
        background:
          'radial-gradient(120% 60% at 50% 0%, #d8d0c0 0%, #b9a689 35%, rgba(120,84,40,.0) 70%), linear-gradient(180deg, #c9bda6 0%, #8a6a3e 55%, #3b2a17 100%)',
      }}
    >
      <LayoutGroup>
        <AnimatePresence mode="popLayout">
          {(phase === 'pill' || phase === 'answered') && (
            <motion.div
              key={phase}
              layoutId="agents"
              className={`flex h-8 items-center gap-2 px-2.5 text-[12px] text-white/85 ${glass}`}
              style={{ borderRadius: 999 }}
              initial={{ opacity: 0, y: 10, filter: 'blur(6px)' }}
              animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
              exit={{ opacity: 0, filter: 'blur(6px)' }}
              transition={soft}
            >
              {phase === 'pill' ? (
                <>
                  <span className="flex -space-x-1">
                    {delegated.slice(0, 3).map((t) => (
                      <AgentIcon key={t.id} kind={t.agent} working size={12} />
                    ))}
                  </span>
                  <span className="text-white/50 tabular-nums">{working.length}</span>
                  <BlurSwap text={working[0] ? lineOf(working[0]) : 'Agents are thinking'} />
                  <Grip size={12} className="text-white/35" />
                </>
              ) : (
                <>
                  <AgentIcon kind="spark" size={12} /> Agent answered <Check size={12} strokeWidth={3} />
                </>
              )}
            </motion.div>
          )}

          {phase === 'panel' && (
            <motion.div
              key="panel"
              layoutId="agents"
              className={`w-full overflow-hidden p-1.5 text-white ${glass}`}
              style={{ borderRadius: 18 }}
              transition={soft}
            >
              <div className="flex items-center justify-between px-2.5 pt-1.5 pb-2 text-[13px] font-medium text-white/90">
                Agents
                <span className="grid size-[18px] place-items-center rounded-full bg-white/10 text-[10px] tabular-nums text-white/70">
                  <BlurSwap text={String(working.length)} />
                </span>
              </div>
              <AnimatePresence initial={false}>
                {working.map((t) => (
                  <motion.div
                    key={t.id}
                    layout
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0, filter: 'blur(4px)' }}
                    transition={spring}
                  >
                    <div className="flex items-center gap-3 rounded-[12px] px-2.5 py-2">
                      <span className="grid size-7 place-items-center rounded-full bg-white/[.06]">
                        <AgentIcon kind={t.agent} working />
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="text-[13px] font-medium text-white/90">{t.label}</div>
                        <BlurSwap text={lineOf(t)} className="text-[11px] text-white/45" />
                      </div>
                      <Grip size={13} className="text-white/25" />
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {showResult && last && (
            <motion.button
              key="result"
              layout
              onClick={reset}
              className={`w-full cursor-pointer rounded-[18px] p-4 text-left text-white ${glass}`}
              initial={{ opacity: 0, scale: 0.94, y: -12, filter: 'blur(8px)' }}
              animate={{ opacity: 1, scale: 1, y: 0, filter: 'blur(0px)' }}
              exit={{ opacity: 0, scale: 0.96, filter: 'blur(8px)' }}
              transition={soft}
            >
              <div className="flex items-center justify-between text-[15px] text-white/90">
                {last.label}
                <AgentIcon kind={last.agent} />
              </div>
              <div className="mt-1.5 flex items-center gap-0.5 text-[13px] text-white/45">
                Worked for 2m 14s <ChevronRight size={13} />
              </div>
              <div className="mt-1 text-[13px] text-white/85">{last.result?.summary ?? `${last.label}: done.`}</div>
              {last.result?.table && (
                <div className="mt-3 grid grid-cols-3 overflow-hidden rounded-[12px] bg-white/[.04] text-[13px] shadow-[inset_0_0_0_1px_rgba(255,255,255,.07)]">
                  {last.result.table.map(([k, v], i) => (
                    <div key={k} className={i ? 'border-l border-white/[.07]' : ''}>
                      <div className="border-b border-white/[.07] px-3 py-2 font-medium text-white/75">{k}</div>
                      <div className={`px-3 py-2 tabular-nums ${i === 2 ? 'font-semibold' : 'text-white/80'}`}>{v}</div>
                    </div>
                  ))}
                </div>
              )}
              {last.result?.file && (
                <div className="mt-2 flex items-center gap-3 rounded-[12px] bg-white/[.04] p-2.5 shadow-[inset_0_0_0_1px_rgba(255,255,255,.07)]">
                  <span className="grid size-8 place-items-center rounded-[7px] bg-[#1f7a46] text-[7px] font-bold tracking-wide">XLSX</span>
                  <div className="flex-1">
                    <div className="text-[13px] text-white/90">{last.result.file}</div>
                    <div className="text-[11px] text-white/45">Microsoft Excel workbook</div>
                  </div>
                  <span className="flex items-center gap-1 rounded-[8px] bg-white/[.08] px-2 py-1 text-[11px] text-white/80">
                    Open in <ChevronDown size={11} />
                  </span>
                </div>
              )}
            </motion.button>
          )}
        </AnimatePresence>

        <motion.div layout transition={spring} className={`w-full overflow-hidden px-1.5 pb-1.5 text-white ${glass}`} style={{ borderRadius: 18 }}>
          <motion.div layout="position" className="flex items-center justify-between px-2.5 pt-3 pb-1.5">
            <span className="text-[15px] font-medium text-white/90">This week</span>
            <span className="grid size-5 place-items-center rounded-full bg-white/10 text-white/60">
              <Plus size={12} strokeWidth={2.5} />
            </span>
          </motion.div>
          <AnimatePresence initial={false}>
            {visible.map((t) => {
              const isSel = selected.includes(t.id)
              const isDone = finished(t)
              const agentOn = delegated.includes(t)
              return (
                <motion.div
                  key={t.id}
                  layout="position"
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0, filter: 'blur(4px)' }}
                  transition={spring}
                >
                  <TaskRow task={t} selected={isSel} done={isDone} agentOn={agentOn} order={delegated.indexOf(t)} onToggle={toggle} />
                </motion.div>
              )
            })}
          </AnimatePresence>
        </motion.div>

        <AnimatePresence>
          {selected.length > 0 && phase === 'idle' && (
            <motion.button
              key="delegate"
              layout
              onClick={() => delegate()}
              className="flex h-8 cursor-pointer items-center gap-1.5 rounded-full bg-[#ff5b2e] px-3.5 text-[13px] font-medium text-white shadow-[0_8px_24px_-6px_rgba(255,91,46,.7)]"
              initial={{ opacity: 0, y: 8, scale: 0.9, filter: 'blur(6px)' }}
              animate={{ opacity: 1, y: 0, scale: 1, filter: 'blur(0px)' }}
              exit={{ opacity: 0, y: 8, scale: 0.9, filter: 'blur(6px)' }}
              whileTap={{ scale: 0.95 }}
              transition={{ type: 'spring', stiffness: 520, damping: 34 }}
            >
              <Asterisk size={13} strokeWidth={3} /> Delegate
              <span className="text-white/70 tabular-nums">
                <BlurSwap text={String(selected.length)} />
              </span>
            </motion.button>
          )}
        </AnimatePresence>
      </LayoutGroup>
    </div>
  )
}

export default function AgentDelegateDemo() {
  return <AgentDelegate demo />
}
