import { useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { CircleCheck, CircleDashed, CircleDot, Eye } from 'lucide-react'

export type Status = 'todo' | 'progress' | 'review' | 'done'

export const statuses: Record<Status, { label: string; Icon: typeof CircleDot; light: string; dark: string }> = {
  todo: { label: 'To do', Icon: CircleDashed, light: 'bg-[#7c6cf0]/12 text-[#6253e0]', dark: 'bg-[#7c6cf0]/20 text-[#b3aaff]' },
  progress: { label: 'In progress', Icon: CircleDot, light: 'bg-[#fdf0dc] text-[#c46f06]', dark: 'bg-[#e8870e]/20 text-[#ffb35c]' },
  review: { label: 'In review', Icon: Eye, light: 'bg-[#3b82f6]/12 text-[#2563eb]', dark: 'bg-[#3b82f6]/20 text-[#8ab4ff]' },
  done: { label: 'Done', Icon: CircleCheck, light: 'bg-[#22a55a]/12 text-[#178a47]', dark: 'bg-[#22a55a]/20 text-[#6ee39b]' },
}

export function StatusChip({ status, dark = false }: { status: Status; dark?: boolean }) {
  const s = statuses[status]
  return (
    <motion.span
      layout
      className={`inline-flex items-center gap-1 rounded-[6px] px-1.5 py-0.5 text-[11px] font-medium ${dark ? s.dark : s.light}`}
    >
      <s.Icon size={11} strokeWidth={2.4} />
      {s.label}
    </motion.span>
  )
}

/** The full set of options, growing in below the chip. Put it in a flex-wrap parent: it takes a whole row. */
export function StatusOptions({
  open,
  value,
  onPick,
  dark = false,
}: {
  open: boolean
  value: Status
  onPick: (s: Status) => void
  dark?: boolean
}) {
  return (
    <AnimatePresence initial={false}>
      {open && (
        <motion.div
          key="options"
          className="basis-full overflow-hidden"
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 'auto', opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 380, damping: 32 }}
        >
          <div className="flex flex-wrap gap-1.5 pt-2">
            {(Object.keys(statuses) as Status[]).map((s, i) => (
              <motion.button
                key={s}
                initial={{ opacity: 0, y: 4, filter: 'blur(3px)' }}
                animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                transition={{ delay: i * 0.03 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => onPick(s)}
                className={`cursor-pointer rounded-[7px] ${s === value ? (dark ? 'ring-1 ring-white/25' : 'ring-1 ring-black/15') : ''}`}
              >
                <StatusChip status={s} dark={dark} />
              </motion.button>
            ))}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

/** A status chip that opens into the full set of options inline, pushing content down rather than floating. */
export function StatusSelect({ value, onChange, dark = false }: { value: Status; onChange: (s: Status) => void; dark?: boolean }) {
  const [open, setOpen] = useState(false)
  return (
    <>
      <button onClick={() => setOpen((o) => !o)} className="cursor-pointer">
        <StatusChip status={value} dark={dark} />
      </button>
      <StatusOptions open={open} value={value} dark={dark} onPick={(s) => (onChange(s), setOpen(false))} />
    </>
  )
}

export default function StatusSelectDemo() {
  const [value, setValue] = useState<Status>('progress')
  return (
    <div className="flex w-64 flex-wrap items-center gap-2 rounded-[14px] border border-[#e7e7e5] bg-white p-3 shadow-[0_1px_2px_rgba(0,0,0,.04),0_4px_16px_rgba(0,0,0,.05)]">
      <span className="text-[13px] font-medium">Onboarding flow</span>
      <StatusSelect value={value} onChange={setValue} />
    </div>
  )
}
