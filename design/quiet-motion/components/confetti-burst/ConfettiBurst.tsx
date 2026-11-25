import { useEffect, useMemo, useState } from 'react'
import { motion } from 'motion/react'

/** A one-shot particle burst. Change `fire` to set it off again. Place it inside a relative box. */
export function ConfettiBurst({
  fire,
  colors = ['var(--color-accent)', 'var(--color-accent-2)', 'color-mix(in srgb, var(--color-accent-2) 45%, white)', 'var(--color-accent-ink)'],
  count = 16,
  spread = 70,
}: {
  fire: number
  colors?: string[]
  count?: number
  spread?: number
}) {
  const bits = useMemo(
    () =>
      Array.from({ length: count }, (_, i) => {
        const angle = (i / count) * Math.PI * 2 + Math.random() * 0.4
        const dist = spread * (0.55 + Math.random() * 0.45)
        return {
          x: Math.cos(angle) * dist * 1.6,
          y: Math.sin(angle) * dist,
          size: 3 + Math.random() * 3,
          color: colors[i % colors.length],
          round: Math.random() > 0.5,
        }
      }),
    // A new burst gets new random paths.
    [fire, count, spread],
  )
  if (!fire) return null
  return (
    <div className="pointer-events-none absolute inset-0 grid place-items-center" key={fire}>
      {bits.map((b, i) => (
        <motion.span
          key={i}
          className="absolute"
          style={{ width: b.size, height: b.size, background: b.color, borderRadius: b.round ? 99 : 1 }}
          initial={{ x: 0, y: 0, opacity: 1, scale: 0.4 }}
          animate={{ x: b.x, y: b.y, opacity: 0, scale: 1, rotate: b.round ? 0 : 180 }}
          transition={{ duration: 0.9, ease: [0.1, 0.8, 0.3, 1] }}
        />
      ))}
    </div>
  )
}

export default function ConfettiBurstDemo() {
  const [fire, setFire] = useState(1)
  useEffect(() => {
    const t = setInterval(() => setFire((f) => f + 1), 1800)
    return () => clearInterval(t)
  }, [])
  return (
    <button
      onClick={() => setFire((f) => f + 1)}
      className="relative rounded-full bg-gradient-to-b from-accent-2 to-accent px-5 py-2 text-[13px] font-medium text-white shadow-[0_6px_24px_-4px_color-mix(in_srgb,var(--color-accent)_55%,transparent)]"
    >
      <ConfettiBurst fire={fire} />
      Atlas 2.5 is live
    </button>
  )
}
