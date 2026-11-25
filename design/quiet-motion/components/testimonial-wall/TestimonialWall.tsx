import { Marquee } from '../marquee/Marquee'
import { Reveal } from '../reveal/Reveal'

type Quote = { name: string; role: string; text: string; color: string }

const quotes: Quote[] = [
  { name: 'Mara Lindqvist', role: 'Eng lead, Northwind', text: 'We stopped asking "is it out yet?" in Slack. The pill just tells you.', color: '#4ade80' },
  { name: 'Jon Okafor', role: 'Founder, Kestrel', text: 'The first release tool my designers actually open.', color: '#a5b4fc' },
  { name: 'Priya Raman', role: 'PM, Halcyon', text: 'I delegated the invoice chase on a Friday and it was done by lunch.', color: '#c4b5fd' },
  { name: 'Leo Brandt', role: 'iOS dev, Orbit', text: 'Notarization used to be a ritual. Now it is a word that blurs past.', color: '#fdba74' },
  { name: 'Ana Sousa', role: 'Design director, Lumen', text: 'Calm is a feature. Atlas has it everywhere.', color: '#f9a8d4' },
  { name: 'Sam Whitaker', role: 'CTO, Parallax', text: 'Our release checklist is finally the same thing as our release.', color: '#67e8f9' },
]

function Card({ q }: { q: Quote }) {
  return (
    <figure className="w-[320px] shrink-0 rounded-[20px] border border-[#e7e7e5] bg-white p-5 shadow-[0_1px_2px_rgba(0,0,0,.04),0_4px_16px_rgba(0,0,0,.05)]">
      <blockquote className="text-[14.5px] leading-snug text-[#111]">“{q.text}”</blockquote>
      <figcaption className="mt-4 flex items-center gap-2.5">
        <span
          className="grid size-7 place-items-center rounded-full text-[11px] font-semibold text-[#111]"
          style={{ background: `color-mix(in srgb, ${q.color} 55%, white)` }}
        >
          {q.name[0]}
        </span>
        <span className="text-[12.5px] leading-tight">
          <span className="block font-medium text-[#111]">{q.name}</span>
          <span className="text-[#8a8a87]">{q.role}</span>
        </span>
      </figcaption>
    </figure>
  )
}

/** Two rows of quotes drifting in opposite directions; hover holds a row still so it can be read. */
export function TestimonialWall({ items = quotes }: { items?: Quote[] }) {
  const half = Math.ceil(items.length / 2)
  return (
    <section className="text-[#111]">
      <Reveal className="mx-auto max-w-[620px] px-6 text-center">
        <h2 className="text-[clamp(30px,4.5vw,40px)] leading-[1.08] font-semibold tracking-[-0.03em]">Teams ship quieter.</h2>
        <p className="mt-3 text-[17px] text-[#77777a]">What people say after their first month.</p>
      </Reveal>
      <Reveal delay={0.08} className="mt-10 space-y-4">
        <Marquee seconds={50}>
          {items.slice(0, half).map((q) => (
            <Card key={q.name} q={q} />
          ))}
        </Marquee>
        <Marquee seconds={56} reverse>
          {items.slice(half).map((q) => (
            <Card key={q.name} q={q} />
          ))}
        </Marquee>
      </Reveal>
    </section>
  )
}

export default function TestimonialWallDemo() {
  return (
    <div className="w-[1180px] rounded-[14px] bg-[#f4f4f3] py-14">
      <TestimonialWall />
    </div>
  )
}
