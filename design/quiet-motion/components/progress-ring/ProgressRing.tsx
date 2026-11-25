import { useEffect, useState } from 'react'
import { motion } from 'motion/react'
import { BlurSwap } from '../blur-swap/BlurSwap'

/** A small ring that fills toward `value` (0–1), with a count in the middle. */
export function ProgressRing({
  value,
  label,
  size = 22,
  stroke = 2,
  color = 'currentColor',
}: {
  value: number
  label?: string
  size?: number
  stroke?: number
  color?: string
}) {
  const r = (size - stroke) / 2
  return (
    <span className="relative inline-grid place-items-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="absolute inset-0 -rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeOpacity={0.15} strokeWidth={stroke} />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          initial={false}
          animate={{ pathLength: Math.max(0.001, value) }}
          transition={{ type: 'spring', stiffness: 200, damping: 26 }}
        />
      </svg>
      {label !== undefined && <BlurSwap text={label} className="text-[10px] font-semibold tabular-nums" />}
    </span>
  )
}

export default function ProgressRingDemo() {
  const [n, setN] = useState(2)
  useEffect(() => {
    const t = setInterval(() => setN((v) => (v + 1) % 6), 900)
    return () => clearInterval(t)
  }, [])
  return (
    <div className="flex items-center gap-6 text-[#111]">
      <ProgressRing value={n / 5} label={String(n)} />
      <ProgressRing value={n / 5} label={String(n)} size={36} stroke={3} />
      <span className="text-accent">
        <ProgressRing value={n / 5} size={18} />
      </span>
    </div>
  )
}
