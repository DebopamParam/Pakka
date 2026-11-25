import { useId, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { Plus } from 'lucide-react'
import { Reveal } from '../reveal/Reveal'

const faqs = [
  { q: 'Do I have to change how we build?', a: 'No. Atlas reads the pipeline you already have (GitHub Actions, Xcode Cloud, Fastlane) and shows it in one place.' },
  { q: 'What can agents actually do?', a: 'Anything with a clear finish line: chase an invoice, cancel a subscription, collect documents, draft release notes. Each one reports as it goes and asks before anything irreversible.' },
  { q: 'Is my data used to train models?', a: 'Never. Agents run with the permissions you grant per task, and every action is in the audit log.' },
  { q: 'Can I try it with my team?', a: 'Team has a 14-day trial with every feature on. No card needed.' },
  { q: 'What happens when I cancel?', a: 'You keep read-only access to everything, and can export it all as JSON or CSV whenever you like.' },
]

const spring = { type: 'spring', stiffness: 380, damping: 32 } as const

/** One-open-at-a-time questions: the open row lifts onto a card and its answer unfolds out of a blur. */
export function FaqAccordion({ items = faqs }: { items?: { q: string; a: string }[] }) {
  const [open, setOpen] = useState<number | null>(0)
  const card = useId()
  return (
    <section className="mx-auto grid max-w-[1120px] gap-10 px-6 text-[#111] md:grid-cols-[1fr_1.6fr]">
      <Reveal>
        <h2 className="text-[clamp(30px,4.5vw,40px)] leading-[1.08] font-semibold tracking-[-0.03em]">Questions, answered.</h2>
        <p className="mt-3 text-[17px] text-[#77777a]">
          Anything else? <a href="#" className="text-[#111] underline decoration-black/20 underline-offset-4">Ask us</a>, a human replies.
        </p>
      </Reveal>
      <Reveal delay={0.06}>
        <div className="space-y-1">
          {items.map((f, i) => {
            const on = open === i
            return (
              <div key={f.q} className="relative">
                {on && (
                  <motion.div
                    layoutId={card}
                    className="absolute inset-0 rounded-[18px] border border-[#e7e7e5] bg-white shadow-[0_1px_2px_rgba(0,0,0,.04),0_4px_16px_rgba(0,0,0,.05)]"
                    transition={spring}
                  />
                )}
                <button
                  onClick={() => setOpen(on ? null : i)}
                  aria-expanded={on}
                  className="relative flex w-full cursor-pointer items-center gap-4 px-5 py-4 text-left text-[15.5px] font-medium"
                >
                  {f.q}
                  <motion.span
                    animate={{ rotate: on ? 45 : 0, backgroundColor: on ? '#111111' : 'rgba(0,0,0,0.05)', color: on ? '#ffffff' : '#111111' }}
                    transition={spring}
                    className="ml-auto grid size-6 shrink-0 place-items-center rounded-full"
                  >
                    <Plus size={13} strokeWidth={2.5} />
                  </motion.span>
                </button>
                <AnimatePresence initial={false}>
                  {on && (
                    <motion.div
                      key="a"
                      className="relative overflow-hidden"
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={spring}
                    >
                      <motion.p
                        initial={{ filter: 'blur(4px)', y: -4 }}
                        animate={{ filter: 'blur(0px)', y: 0 }}
                        className="max-w-[560px] px-5 pb-5 text-[14.5px] leading-relaxed text-[#666]"
                      >
                        {f.a}
                      </motion.p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )
          })}
        </div>
      </Reveal>
    </section>
  )
}

export default function FaqAccordionDemo() {
  return (
    <div className="w-[1100px] rounded-[14px] bg-[#f4f4f3] py-14">
      <FaqAccordion />
    </div>
  )
}
