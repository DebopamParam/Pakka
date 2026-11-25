import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'

/** Swaps text with a blur + rise instead of a hard cut. Both versions share one grid cell while crossing. */
export function BlurSwap({ text, className = '' }: { text: string; className?: string }) {
  return (
    <span className={`inline-grid ${className}`}>
      <AnimatePresence initial={false}>
        <motion.span
          key={text}
          className="col-start-1 row-start-1 whitespace-nowrap"
          initial={{ opacity: 0, y: 5, filter: 'blur(4px)' }}
          animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
          exit={{ opacity: 0, y: -5, filter: 'blur(4px)' }}
          transition={{ duration: 0.22, ease: [0.2, 0, 0, 1] }}
        >
          {text}
        </motion.span>
      </AnimatePresence>
    </span>
  )
}

const words = ['Building', 'Signing', 'Notarizing', 'Uploading', 'Live']

export default function BlurSwapDemo() {
  const [i, setI] = useState(0)
  useEffect(() => {
    const t = setInterval(() => setI((n) => (n + 1) % words.length), 1200)
    return () => clearInterval(t)
  }, [])
  return (
    <div className="rounded-full bg-[#111] px-4 py-2 text-[13px] font-medium text-white shadow-[0_12px_40px_-8px_rgba(0,0,0,.35)]">
      Atlas 2.5 · <BlurSwap text={words[i]} className="text-white/60" />
    </div>
  )
}
