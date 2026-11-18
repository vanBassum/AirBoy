import type { Airport } from "@/lib/types"
import { cn } from "@/lib/utils"

// Distinct from the purple UI and the airline house colours.
const PALETTE = ["#0d9488", "#ea580c", "#2563eb", "#db2777", "#65a30d", "#ca8a04", "#0891b2", "#9333ea"]

/** Stable colour per airport, based on its position in the airport list. */
export function airportColor(code: string, airports: Airport[]) {
  const i = airports.findIndex((a) => a.code === code)
  return PALETTE[Math.max(i, 0) % PALETTE.length]
}

export function AirportDot({ code, airports, className }: { code: string; airports: Airport[]; className?: string }) {
  return <span className={cn("inline-block size-2.5 shrink-0 rounded-full", className)} style={{ background: airportColor(code, airports) }} />
}

/** Tinted pill with the airport code in its colour. */
export function AirportTag({
  code,
  airports,
  size = "md",
  className,
}: {
  code: string
  airports: Airport[]
  size?: "sm" | "md" | "lg"
  className?: string
}) {
  const c = airportColor(code, airports)
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center justify-center gap-1 rounded-md border font-bold tracking-wide tabular-nums",
        size === "sm" && "px-1 py-0 text-[10px]",
        size === "md" && "px-1.5 py-0.5 text-xs",
        size === "lg" && "h-8 w-14 text-sm",
        className,
      )}
      style={{ color: c, background: `${c}1a`, borderColor: `${c}55` }}
    >
      {code}
    </span>
  )
}
