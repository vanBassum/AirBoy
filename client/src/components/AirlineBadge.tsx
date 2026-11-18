import { cn } from "@/lib/utils"

// House colours only (no logos); unknown airlines get a stable hue from their name.
const known: Record<string, [string, string]> = {
  Ryanair: ["#073590", "#f1c933"],
  "Wizz Air": ["#c6007e", "#ffffff"],
  Transavia: ["#00b259", "#ffffff"],
  "Brussels Airlines": ["#00235f", "#ffffff"],
  KLM: ["#00a1de", "#ffffff"],
  easyJet: ["#ff6600", "#ffffff"],
  Lufthansa: ["#05164d", "#ffad00"],
  "Austrian": ["#e3000f", "#ffffff"],
  "Air Albania": ["#d50032", "#ffffff"],
}

function colours(name: string): [string, string] {
  if (known[name]) return known[name]
  let h = 0
  for (const c of name) h = (h * 31 + c.charCodeAt(0)) % 360
  return [`oklch(0.5 0.15 ${h})`, "#ffffff"]
}

const initials = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase()

export function AirlineBadge({ name, className }: { name: string; className?: string }) {
  const [bg, fg] = colours(name)
  return (
    <span
      className={cn("inline-flex size-8 shrink-0 items-center justify-center rounded-md text-[11px] font-bold", className)}
      style={{ background: bg, color: fg }}
    >
      {initials(name)}
    </span>
  )
}

export function Airline({ names }: { names: string[] }) {
  const name = names[0] ?? "?"
  return (
    <div className="flex min-w-0 items-center gap-2.5">
      <AirlineBadge name={name} />
      <span className="truncate font-semibold">{names.join(" + ")}</span>
    </div>
  )
}
