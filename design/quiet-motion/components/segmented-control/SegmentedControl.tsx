import { useId, useState, type ReactNode } from 'react'
import { motion } from 'motion/react'

/** A pill of options with one sliding thumb behind the active one. */
export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  dark = false,
}: {
  options: { value: T; label: ReactNode }[]
  value: T
  onChange: (v: T) => void
  dark?: boolean
}) {
  const id = useId()
  return (
    <div className={`inline-flex rounded-full p-1 ${dark ? 'bg-white/10' : 'bg-black/[.05]'}`}>
      {options.map((o) => (
        <button
          key={o.value}
          onClick={() => onChange(o.value)}
          className={`relative flex h-8 cursor-pointer items-center gap-1.5 rounded-full px-4 text-[13px] font-medium transition-colors ${
            value === o.value ? 'text-[#111]' : dark ? 'text-white/60' : 'text-[#77777a]'
          }`}
        >
          {value === o.value && (
            <motion.span
              layoutId={id}
              className="absolute inset-0 rounded-full bg-white shadow-[0_1px_2px_rgba(0,0,0,.08),0_2px_8px_rgba(0,0,0,.06)]"
              transition={{ type: 'spring', stiffness: 520, damping: 34 }}
            />
          )}
          <span className="relative flex items-center gap-1.5">{o.label}</span>
        </button>
      ))}
    </div>
  )
}

export default function SegmentedControlDemo() {
  const [v, setV] = useState<'monthly' | 'yearly'>('yearly')
  const [view, setView] = useState<'list' | 'board' | 'calendar'>('board')
  return (
    <div className="flex flex-col items-center gap-4">
      <SegmentedControl
        value={v}
        onChange={setV}
        options={[
          { value: 'monthly', label: 'Monthly' },
          { value: 'yearly', label: <>Yearly <span className="rounded-full bg-accent/15 px-1.5 text-[11px] text-accent-ink">-20%</span></> },
        ]}
      />
      <div className="rounded-[18px] bg-[#1b1b1b] p-3">
        <SegmentedControl
          dark
          value={view}
          onChange={setView}
          options={[
            { value: 'list', label: 'List' },
            { value: 'board', label: 'Board' },
            { value: 'calendar', label: 'Calendar' },
          ]}
        />
      </div>
    </div>
  )
}
