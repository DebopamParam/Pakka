import { useEffect, useId, useRef, useState } from 'react'
import { AnimatePresence, LayoutGroup, motion, type Transition } from 'motion/react'
import { ArrowRight } from 'lucide-react'

const spring = { type: 'spring', stiffness: 380, damping: 32 } as const
// Ink arrives a beat after the shrink starts, so the bar never reads as a full-width grey slab; it leaves at once.
const fade = (c: boolean): Transition => (c ? { duration: 0.24, delay: 0.06, ease: [0.2, 0, 0, 1] } : { duration: 0.14, ease: 'easeOut' })

/**
 * A site nav that sits flat in the page at the top and, once you scroll, gathers itself into a dark
 * floating island with a live status dot. Pass `condensed` to control it; otherwise it follows scroll.
 */
export function IslandNav({
  condensed: forced,
  brand = 'Atlas',
  links = ['Product', 'Agents', 'Pricing', 'Changelog'],
  status = '2.5 is live',
}: {
  condensed?: boolean
  brand?: string
  links?: string[]
  status?: string
}) {
  const [scrolled, setScrolled] = useState(false)
  const [hover, setHover] = useState<string | null>(null)
  const id = useId()

  useEffect(() => {
    if (forced !== undefined) return
    const on = () => setScrolled(window.scrollY > 48)
    on()
    window.addEventListener('scroll', on, { passive: true })
    return () => window.removeEventListener('scroll', on)
  }, [forced])

  const c = forced ?? scrolled

  return (
    <div className="pointer-events-none sticky top-0 z-40 flex justify-center px-4 pt-3">
      <LayoutGroup id={id}>
        <motion.nav
          initial={false}
          animate={{ color: c ? '#ffffff' : '#111111' }}
          transition={fade(c)}
          className={`pointer-events-auto relative isolate flex items-center ${c ? 'h-11 gap-1 pr-1.5 pl-3.5' : 'h-14 w-full max-w-[1120px] justify-between px-2'}`}
        >
          {/* The island itself: an empty layer that morphs to the nav's box. Nothing inside it, so nothing stretches. */}
          <motion.div
            layout
            aria-hidden
            initial={false}
            animate={{ opacity: c ? 1 : 0 }}
            transition={{ layout: spring, opacity: fade(c) }}
            style={{ borderRadius: 999 }}
            className="absolute inset-0 -z-10 bg-[#111]/92 shadow-[0_12px_40px_-8px_rgba(0,0,0,.35),inset_0_0_0_1px_rgba(255,255,255,.06)] backdrop-blur-xl"
          />

          <motion.a layout="position" transition={spring} href="#" className="relative flex items-center gap-2 text-[14px] font-semibold">
            <motion.span className="size-4 rounded-[5px]" initial={false} animate={{ backgroundColor: c ? '#ffffff' : '#111111' }} transition={fade(c)} />
            {brand}
            <AnimatePresence mode="popLayout" initial={false}>
              {c && (
                <motion.span
                  key="status"
                  className="ml-1 flex items-center gap-1.5 text-[12px] font-medium whitespace-nowrap text-white/60"
                  initial={{ opacity: 0, filter: 'blur(4px)' }}
                  animate={{ opacity: 1, filter: 'blur(0px)', transition: { duration: 0.25, delay: 0.1 } }}
                  exit={{ opacity: 0, filter: 'blur(4px)', transition: { duration: 0.12 } }}
                >
                  <span className="relative grid size-2 place-items-center">
                    <motion.span
                      className="absolute size-2 rounded-full bg-accent"
                      animate={{ scale: [1, 2.2], opacity: [0.6, 0] }}
                      transition={{ repeat: Infinity, duration: 1.6 }}
                    />
                    <span className="size-1.5 rounded-full bg-accent" />
                  </span>
                  {status}
                </motion.span>
              )}
            </AnimatePresence>
          </motion.a>

          <motion.ul layout="position" transition={spring} className={`hidden items-center md:flex ${c ? 'mx-3' : ''}`} onMouseLeave={() => setHover(null)}>
            {links.map((l) => (
              <li key={l} onMouseEnter={() => setHover(l)} className="relative">
                {hover === l && (
                  <motion.span
                    layoutId="hover"
                    className={`absolute inset-0 rounded-full ${c ? 'bg-white/12' : 'bg-black/[.05]'}`}
                    transition={{ type: 'spring', stiffness: 520, damping: 34 }}
                  />
                )}
                <a href="#" className={`relative block px-3 py-1.5 text-[13px] font-medium transition-colors duration-200 ${c ? 'text-white/75' : 'text-[#111]/70'}`}>
                  {l}
                </a>
              </li>
            ))}
          </motion.ul>

          {/* Not animated itself: its corner moves when "Sign in" leaves. The CTA glides on its own, and "Sign in" pops out
              relative to the nav so it fades where it stood. */}
          <div className="flex items-center gap-1">
            <AnimatePresence mode="popLayout" initial={false}>
              {!c && (
                <motion.a
                  key="sign-in"
                  href="#"
                  className="px-3 py-1.5 text-[13px] font-medium whitespace-nowrap text-[#111]/70"
                  initial={{ opacity: 0, filter: 'blur(4px)' }}
                  animate={{ opacity: 1, filter: 'blur(0px)', transition: { duration: 0.25, delay: 0.1 } }}
                  exit={{ opacity: 0, filter: 'blur(4px)', transition: { duration: 0.12 } }}
                >
                  Sign in
                </motion.a>
              )}
            </AnimatePresence>
            <motion.a
              layout="position"
              href="#"
              whileTap={{ scale: 0.96 }}
              transition={{ layout: spring }}
              // The colour is a CSS transition on the accent variable, not a motion value, so a theme change applies at once.
              className={`group flex h-8 items-center gap-1 rounded-full px-3.5 text-[13px] font-medium whitespace-nowrap text-white transition-colors ${
                c ? 'bg-accent delay-[60ms] duration-[240ms] ease-[cubic-bezier(.2,0,0,1)]' : 'bg-[#111] duration-[140ms] ease-out'
              }`}
            >
              Get {brand}
              <ArrowRight size={13} strokeWidth={2.5} className="transition-transform duration-200 group-hover:translate-x-0.5" />
            </motion.a>
          </div>
        </motion.nav>
      </LayoutGroup>
    </div>
  )
}

export default function IslandNavDemo() {
  const [c, setC] = useState(false)
  const touched = useRef(false)
  useEffect(() => {
    const t = setInterval(() => !touched.current && setC((v) => !v), 2400)
    return () => clearInterval(t)
  }, [])
  return (
    <div className="w-[1100px] overflow-hidden rounded-[14px] bg-[#f4f4f3]" onPointerEnter={() => (touched.current = true)}>
      <IslandNav condensed={c} />
      <div className="flex flex-col items-center gap-3 pt-10 pb-12">
        <button onClick={() => setC((v) => !v)} className="cursor-pointer rounded-full bg-black/5 px-3 py-1 text-[12px] font-medium text-[#77777a]">
          {c ? 'Scrolled: island' : 'At top: flat'} · click to toggle
        </button>
        <div className="h-10 w-[560px] rounded-full bg-[#e9e9e7]" />
        <div className="h-4 w-[420px] rounded-full bg-[#ececea]" />
      </div>
    </div>
  )
}
