import { useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { Check } from 'lucide-react'
import { BlurSwap } from '../blur-swap/BlurSwap'
import { NumberTicker } from '../number-ticker/NumberTicker'
import { SegmentedControl } from '../segmented-control/SegmentedControl'
import { Reveal } from '../reveal/Reveal'

type Billing = 'monthly' | 'yearly'

const plans = [
  { name: 'Solo', blurb: 'For one person shipping side projects.', monthly: 0, yearly: 0, cta: 'Start free', features: ['3 projects', 'Release island', 'Community support'] },
  {
    name: 'Team',
    blurb: 'For product teams that ship every week.',
    monthly: 12,
    yearly: 10,
    cta: 'Start a 14-day trial',
    featured: true,
    features: ['Unlimited projects', 'Agents (5 running at once)', 'Checklists and owners', 'Priority support'],
  },
  { name: 'Studio', blurb: 'For agencies running many clients.', monthly: 29, yearly: 24, cta: 'Talk to us', features: ['Everything in Team', 'Unlimited agents', 'Client workspaces', 'SSO and audit log'] },
]

/** Three plans with a monthly/yearly switch; prices roll like an odometer and the featured plan is the dark one. */
export function PricingTable() {
  const [billing, setBilling] = useState<Billing>('yearly')
  return (
    <section className="mx-auto max-w-[1120px] px-6 text-[#111]">
      <Reveal className="flex flex-col items-center text-center">
        <h2 className="text-[clamp(30px,4.5vw,40px)] leading-[1.08] font-semibold tracking-[-0.03em]">Simple pricing, per seat.</h2>
        <p className="mt-3 text-[17px] text-[#77777a]">Free for one. Pay when your team joins.</p>
        <div className="mt-7">
          <SegmentedControl
            value={billing}
            onChange={setBilling}
            options={[
              { value: 'monthly', label: 'Monthly' },
              {
                value: 'yearly',
                label: (
                  <>
                    Yearly
                    <AnimatePresence initial={false}>
                      {billing === 'yearly' && (
                        <motion.span
                          initial={{ scale: 0, width: 0 }}
                          animate={{ scale: 1, width: 'auto' }}
                          exit={{ scale: 0, width: 0 }}
                          transition={{ type: 'spring', stiffness: 600, damping: 18 }}
                          className="overflow-hidden rounded-full bg-accent/15 px-1.5 text-[11px] whitespace-nowrap text-accent-ink"
                        >
                          -20%
                        </motion.span>
                      )}
                    </AnimatePresence>
                  </>
                ),
              },
            ]}
          />
        </div>
      </Reveal>

      <div className="mt-10 grid grid-cols-1 items-stretch gap-4 md:grid-cols-3">
        {plans.map((p, i) => {
          const dark = p.featured
          const price = billing === 'yearly' ? p.yearly : p.monthly
          return (
            <Reveal key={p.name} delay={i * 0.06}>
              <motion.div
                whileHover={{ y: -4 }}
                transition={{ type: 'spring', stiffness: 380, damping: 32 }}
                className={`flex h-full flex-col rounded-[24px] p-6 ${
                  dark
                    ? 'bg-[#111] text-white shadow-[0_24px_60px_-20px_rgba(0,0,0,.55),inset_0_0_0_1px_rgba(255,255,255,.06)]'
                    : 'border border-[#e7e7e5] bg-white shadow-[0_1px_2px_rgba(0,0,0,.04),0_4px_16px_rgba(0,0,0,.05)]'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-[15px] font-semibold">{p.name}</span>
                  {dark && (
                    <span className="flex items-center gap-1.5 rounded-full bg-accent/20 px-2 py-0.5 text-[11px] font-medium text-accent-soft">
                      <span className="size-1.5 rounded-full bg-accent" /> Most popular
                    </span>
                  )}
                </div>
                <p className={`mt-1 text-[13.5px] ${dark ? 'text-white/55' : 'text-[#77777a]'}`}>{p.blurb}</p>
                <div className="mt-6 flex items-baseline gap-1.5">
                  <span className="text-[48px] font-semibold tracking-[-0.035em]">
                    $<NumberTicker value={price} />
                  </span>
                  <BlurSwap
                    text={price === 0 ? 'forever' : billing === 'yearly' ? '/ seat / mo, billed yearly' : '/ seat / mo'}
                    className={`text-[13px] ${dark ? 'text-white/50' : 'text-[#8a8a87]'}`}
                  />
                </div>
                <motion.a
                  whileTap={{ scale: 0.97 }}
                  href="#"
                  className={`mt-6 flex h-10 items-center justify-center rounded-full text-[13.5px] font-medium ${
                    dark ? 'bg-accent text-white' : 'border border-[#e2e2df] bg-white text-[#111] hover:bg-[#f7f7f5]'
                  }`}
                >
                  {p.cta}
                </motion.a>
                <ul className={`mt-6 space-y-2.5 border-t pt-5 text-[13.5px] ${dark ? 'border-white/10' : 'border-[#efefed]'}`}>
                  {p.features.map((f) => (
                    <li key={f} className="flex items-center gap-2.5">
                      <span className={`grid size-4 place-items-center rounded-full ${dark ? 'bg-white text-[#111]' : 'bg-[#111] text-white'}`}>
                        <Check size={10} strokeWidth={3.5} />
                      </span>
                      <span className={dark ? 'text-white/85' : ''}>{f}</span>
                    </li>
                  ))}
                </ul>
              </motion.div>
            </Reveal>
          )
        })}
      </div>
    </section>
  )
}

export default function PricingTableDemo() {
  return (
    <div className="w-[1180px] rounded-[14px] bg-[#f4f4f3] py-14">
      <PricingTable />
    </div>
  )
}
