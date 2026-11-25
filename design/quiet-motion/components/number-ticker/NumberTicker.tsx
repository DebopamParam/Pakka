import { useEffect, useState } from 'react'
import { motion } from 'motion/react'

const digits = '0123456789'.split('')

function Digit({ d }: { d: number }) {
  return (
    <span className="relative inline-block h-[1em] w-[1ch] overflow-hidden leading-none">
      <motion.span
        className="absolute inset-x-0 top-0 flex flex-col"
        initial={false}
        animate={{ y: `${-d}em` }}
        transition={{ type: 'spring', stiffness: 200, damping: 26 }}
      >
        {digits.map((n) => (
          <span key={n} className="h-[1em] text-center">
            {n}
          </span>
        ))}
      </motion.span>
    </span>
  )
}

/** An odometer: each digit is a 0–9 reel that springs to its place. Keys count from the right, so reels keep their place as the number grows. */
export function NumberTicker({
  value,
  format = (n) => n.toLocaleString('en-US'),
  className = '',
}: {
  value: number
  format?: (n: number) => string
  className?: string
}) {
  const str = format(value)
  return (
    <span className={`inline-flex items-baseline leading-none tabular-nums ${className}`} aria-label={str}>
      {str.split('').map((ch, i) =>
        /\d/.test(ch) ? <Digit key={str.length - i} d={Number(ch)} /> : <span key={`${str.length - i}${ch}`}>{ch}</span>,
      )}
    </span>
  )
}

const values = [12, 24, 1284, 98, 360]

export default function NumberTickerDemo() {
  const [i, setI] = useState(0)
  useEffect(() => {
    const t = setInterval(() => setI((n) => (n + 1) % values.length), 1400)
    return () => clearInterval(t)
  }, [])
  return (
    <div className="flex items-baseline gap-1 text-[56px] font-semibold tracking-[-0.03em] text-[#111]">
      $<NumberTicker value={values[i]} />
      <span className="text-[16px] font-normal tracking-normal text-[#8a8a87]">/mo</span>
    </div>
  )
}
