import { useState } from 'react'
import { motion } from 'motion/react'

export type Person = { id: string; initial: string; color: string }

export const people: Person[] = [
  { id: 'Mara', initial: 'M', color: '#4ade80' },
  { id: 'Jon', initial: 'J', color: '#a5b4fc' },
  { id: 'Priya', initial: 'P', color: '#c4b5fd' },
]

export function Avatar({ person, size = 16, dark = false }: { person: Person; size?: number; dark?: boolean }) {
  return (
    <span
      className={`grid shrink-0 place-items-center rounded-full font-semibold ring-[1.5px] ${dark ? 'text-white ring-[#1b1b1b]' : 'text-[#111] ring-white'}`}
      style={{
        width: size,
        height: size,
        fontSize: size * 0.5,
        background: dark ? `color-mix(in srgb, ${person.color} 45%, #1b1b1b)` : `color-mix(in srgb, ${person.color} 55%, white)`,
      }}
    >
      {person.initial}
    </span>
  )
}

/** Overlapping avatars; hovering one lifts it and dims the others, and reports who is focused. */
export function AvatarStack({
  list = people,
  dark = false,
  focused,
  onFocus,
}: {
  list?: Person[]
  dark?: boolean
  focused?: string | null
  onFocus?: (id: string | null) => void
}) {
  return (
    <div className="flex" onMouseLeave={() => onFocus?.(null)}>
      {list.map((p, i) => (
        <motion.span
          key={p.id}
          onMouseEnter={() => onFocus?.(p.id)}
          className="-ml-1 first:ml-0"
          style={{ zIndex: focused === p.id ? 10 : list.length - i }}
          animate={{ y: focused === p.id ? -2 : 0, opacity: focused && focused !== p.id ? 0.35 : 1, scale: focused === p.id ? 1.12 : 1 }}
          transition={{ type: 'spring', stiffness: 520, damping: 34 }}
        >
          <Avatar person={p} dark={dark} />
        </motion.span>
      ))}
    </div>
  )
}

export default function AvatarStackDemo() {
  const [focused, setFocused] = useState<string | null>(null)
  return (
    <div className="flex flex-col items-center gap-3">
      <div className="scale-[2]">
        <AvatarStack focused={focused} onFocus={setFocused} />
      </div>
      <span className="mt-4 text-[12px] text-[#8a8a87]">{focused ? `Focused: ${focused}` : 'Hover an avatar'}</span>
    </div>
  )
}
