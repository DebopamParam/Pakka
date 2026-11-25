import { useEffect, useState } from 'react'
import { motion } from 'motion/react'

const N = 5
// Cells in spiral order, outside in, so the loading trail coils toward the centre.
const spiral = (() => {
  const out: number[] = []
  let [top, left, bottom, right] = [0, 0, N - 1, N - 1]
  while (top <= bottom && left <= right) {
    for (let c = left; c <= right; c++) out.push(top * N + c)
    for (let r = top + 1; r <= bottom; r++) out.push(r * N + right)
    if (top < bottom) for (let c = right - 1; c >= left; c--) out.push(bottom * N + c)
    if (left < right) for (let r = bottom - 1; r > top; r--) out.push(r * N + left)
    top++, left++, bottom--, right--
  }
  return out
})()
const check = new Set([9, 13, 15, 17, 21])
const TRAIL = 7

/** A 5×5 pixel loader: a trail coils through the grid while loading, then a check lights up. */
export function DotMatrix({ done = false, size = 8 }: { done?: boolean; size?: number }) {
  const [tick, setTick] = useState(0)
  useEffect(() => {
    if (done) return
    const t = setInterval(() => setTick((n) => n + 1), 70)
    return () => clearInterval(t)
  }, [done])

  const lit = (cell: number) => {
    if (done) return check.has(cell) ? 1 : 0
    const age = (tick - spiral.indexOf(cell) + spiral.length * 4) % spiral.length
    return age < TRAIL ? 1 - age / TRAIL : 0
  }

  return (
    <div className="grid" style={{ gridTemplateColumns: `repeat(${N}, ${size}px)`, gap: size / 4 }}>
      {Array.from({ length: N * N }, (_, cell) => {
        const v = lit(cell)
        return (
          <motion.div
            key={cell}
            style={{ width: size, height: size, borderRadius: size / 5 }}
            animate={{
              backgroundColor: v > 0 ? `rgba(255,255,255,${0.35 + v * 0.65})` : 'rgba(255,255,255,0.16)',
              scale: done && v ? [0.6, 1.15, 1] : 1,
            }}
            transition={done ? { delay: [...check].indexOf(cell) * 0.05, duration: 0.35 } : { duration: 0.08 }}
          />
        )
      })}
    </div>
  )
}

export default function DotMatrixDemo() {
  const [done, setDone] = useState(false)
  useEffect(() => {
    const t = setTimeout(() => setDone((d) => !d), done ? 1600 : 2600)
    return () => clearTimeout(t)
  }, [done])
  return (
    <div className="grid size-40 place-items-center rounded-[18px] bg-[#1b1b1b] shadow-[0_12px_40px_-8px_rgba(0,0,0,.35)]">
      <DotMatrix done={done} />
    </div>
  )
}
