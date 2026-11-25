import type { ReactNode } from 'react'
import { MotionConfig } from 'motion/react'
import { Check } from 'lucide-react'
import { IslandNav } from '../components/island-nav/IslandNav'
import { HeroSection } from '../components/hero-section/HeroSection'
import { ReleaseIsland } from '../components/release-island/ReleaseIsland'
import { Marquee } from '../components/marquee/Marquee'
import { BentoFeatures } from '../components/bento-features/BentoFeatures'
import { AgentDelegate } from '../components/agent-delegate/AgentDelegate'
import { TaskCard } from '../components/task-card/TaskCard'
import { StatsBand } from '../components/stats-band/StatsBand'
import { PricingTable } from '../components/pricing-table/PricingTable'
import { TestimonialWall } from '../components/testimonial-wall/TestimonialWall'
import { FaqAccordion } from '../components/faq-accordion/FaqAccordion'
import { CtaCapture } from '../components/cta-capture/CtaCapture'
import { Reveal } from '../components/reveal/Reveal'

const logos = ['Northwind', 'Lumen', 'Kestrel', 'Halcyon', 'Parallax', 'Orbit', 'Fieldnote', 'Tandem']

function Showcase({ eyebrow, title, muted, points, visual, flip = false }: { eyebrow: string; title: string; muted: string; points: string[]; visual: ReactNode; flip?: boolean }) {
  return (
    <section className="mx-auto grid max-w-[1120px] items-center gap-12 px-6 md:grid-cols-2">
      <Reveal className={flip ? 'md:order-2' : ''}>
        <div className="text-[12.5px] font-medium tracking-wide text-accent-ink uppercase">{eyebrow}</div>
        <h2 className="mt-3 text-[clamp(30px,4.5vw,40px)] leading-[1.08] font-semibold tracking-[-0.03em]">
          {title}
          <br />
          <span className="text-[#8a8a87]">{muted}</span>
        </h2>
        <ul className="mt-6 space-y-3 text-[15px] text-[#555]">
          {points.map((p) => (
            <li key={p} className="flex gap-3">
              <span className="mt-0.5 grid size-5 shrink-0 place-items-center rounded-full bg-[#111] text-white">
                <Check size={11} strokeWidth={3.5} />
              </span>
              {p}
            </li>
          ))}
        </ul>
      </Reveal>
      <Reveal delay={0.08} className={`flex justify-center ${flip ? 'md:order-1' : ''}`}>
        {visual}
      </Reveal>
    </section>
  )
}

/** The Quiet Motion box as one page: a product site for "Atlas", built only from the box's components. */
export default function LandingPage() {
  return (
    <MotionConfig reducedMotion="user">
      <div className="min-h-screen bg-[#f4f4f3] font-sans text-[#111] antialiased">
        <IslandNav />
        <HeroSection>
          <ReleaseIsland />
        </HeroSection>

        <Reveal className="mx-auto mt-16 max-w-[1120px] px-6">
          <p className="text-center text-[13px] text-[#8a8a87]">Shipping every week at</p>
          <div className="mt-5">
            <Marquee seconds={36}>
              {logos.map((l) => (
                <span key={l} className="px-6 text-[22px] font-semibold tracking-[-0.03em] text-[#111]/30">
                  {l}
                </span>
              ))}
            </Marquee>
          </div>
        </Reveal>

        <div className="mt-32 space-y-32 pb-24">
          <BentoFeatures />
          <Showcase
            eyebrow="Agents"
            title="Hand off the chores."
            muted="Watch them get done."
            points={['Select tasks, press Delegate, keep working.', 'Each agent narrates its step in one line.', 'Finished work checks itself off and folds away.']}
            visual={<AgentDelegate demo />}
          />
          <Showcase
            flip
            eyebrow="Checklists"
            title="One card per launch."
            muted="Everyone knows their part."
            points={['A ring shows how far along you are.', 'Hover a teammate to see only their work.', 'Status changes right in the card, no menus.']}
            visual={
              <div className="flex flex-col items-center gap-4 rounded-[28px] bg-[#efeeeb] p-8">
                <TaskCard demo />
                <TaskCard dark />
              </div>
            }
          />
          <StatsBand />
          <PricingTable />
          <TestimonialWall />
          <FaqAccordion />
          <CtaCapture />
        </div>

        <footer className="mx-auto max-w-[1120px] overflow-hidden px-6 pt-8 pb-10">
          <div className="flex flex-wrap justify-between gap-8 border-t border-[#e7e7e5] pt-10 text-[13px]">
            <div className="flex items-center gap-2 font-semibold">
              <span className="size-4 rounded-[5px] bg-[#111]" /> Atlas
            </div>
            {[
              ['Product', 'Release island', 'Agents', 'Checklists', 'Changelog'],
              ['Company', 'About', 'Careers', 'Blog'],
              ['Help', 'Docs', 'Status', 'Contact'],
            ].map(([head, ...links]) => (
              <div key={head} className="space-y-2">
                <div className="font-medium">{head}</div>
                {links.map((l) => (
                  <a key={l} href="#" className="block text-[#8a8a87] hover:text-[#111]">
                    {l}
                  </a>
                ))}
              </div>
            ))}
          </div>
          <div className="mt-16 text-[clamp(96px,22vw,260px)] leading-[0.8] font-semibold tracking-[-0.06em] text-[#111]/[.05] select-none">Atlas</div>
        </footer>
      </div>
    </MotionConfig>
  )
}
