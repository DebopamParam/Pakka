import { AnimatePresence, motion, useReducedMotion } from 'motion/react'

export function BlurSwap({ text }: { text: string }) {
  const reduce = useReducedMotion()

  if (reduce) return <span>{text}</span>

  return (
    <span className="blur-swap">
      <AnimatePresence initial={false}>
        <motion.span
          key={text}
          initial={{ opacity: 0, y: 5, filter: 'blur(4px)' }}
          animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
          exit={{ opacity: 0, y: -5, filter: 'blur(4px)' }}
          transition={{ type: 'spring', stiffness: 520, damping: 34 }}
        >
          {text}
        </motion.span>
      </AnimatePresence>
    </span>
  )
}

function Digit({ digit }: { digit: number }) {
  return (
    <span className="digit-window">
      <motion.span
        className="digit-reel"
        initial={false}
        animate={{ y: `${-digit}em` }}
        transition={{ type: 'spring', stiffness: 200, damping: 26 }}
      >
        {Array.from('0123456789', (item) => <span key={item}>{item}</span>)}
      </motion.span>
    </span>
  )
}

export function NumberTicker({ text }: { text: string }) {
  const reduce = useReducedMotion()
  if (reduce) return <span>{text}</span>

  return (
    <span className="number-ticker">
      <span className="sr-only">{text}</span>
      <span aria-hidden="true">
        {Array.from(text, (char, index) => {
          const key = text.length - index
          return /\d/.test(char) ? <Digit key={key} digit={Number(char)} /> : <span key={`${key}${char}`}>{char}</span>
        })}
      </span>
    </span>
  )
}
