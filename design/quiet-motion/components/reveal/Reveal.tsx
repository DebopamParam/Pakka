import { useState, type ReactNode } from 'react'
import { motion } from 'motion/react'

/** Fades a block in from blur as it scrolls into view, once. Stagger siblings with `delay`. */
export function Reveal({ children, delay = 0, className = '' }: { children: ReactNode; delay?: number; className?: string }) {
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y: 16, filter: 'blur(8px)' }}
      whileInView={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
      viewport={{ once: true, margin: '-60px' }}
      transition={{ type: 'spring', stiffness: 200, damping: 26, delay }}
    >
      {children}
    </motion.div>
  )
}

export default function RevealDemo() {
  const [n, setN] = useState(0)
  return (
    <div className="flex w-[520px] flex-col items-center gap-4">
      <div key={n} className="grid w-full grid-cols-3 gap-3">
        {['Plan', 'Build', 'Ship'].map((t, i) => (
          <Reveal key={t} delay={i * 0.06}>
            <div className="h-28 rounded-[18px] border border-[#e7e7e5] bg-white p-4 text-[15px] font-semibold shadow-[0_1px_2px_rgba(0,0,0,.04),0_4px_16px_rgba(0,0,0,.05)]">
              {t}
            </div>
          </Reveal>
        ))}
      </div>
      <button onClick={() => setN((v) => v + 1)} className="cursor-pointer text-[12px] font-medium text-[#77777a] hover:text-[#111]">
        Replay
      </button>
    </div>
  )
}
