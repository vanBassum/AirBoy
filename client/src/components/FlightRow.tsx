import { ArrowRight, Plus } from "lucide-react"
import { useTranslation } from "react-i18next"

import { Airline, AirlineBadge } from "@/components/AirlineBadge"
import { AirportTag, airportColor } from "@/components/AirportTag"
import { Button } from "@/components/ui/button"
import { fmtDate, fmtDuration, fmtEuro, fmtStops } from "@/lib/format"
import type { Airport, FlightOption, LegResult } from "@/lib/types"

type Props = {
  leg: LegResult
  f: FlightOption
  airports: Airport[]
  compact: boolean
  actionLabel: string
  onAction: () => void
}

function Route({ leg, airports, size }: { leg: LegResult; airports: Airport[]; size: "sm" | "md" }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-sm">
      <AirportTag code={leg.from} airports={airports} size={size} />
      <ArrowRight className="size-3.5 text-muted-foreground" />
      <AirportTag code={leg.to} airports={airports} size={size} />
    </span>
  )
}

const plusDay = (f: FlightOption) => f.arrivalDate !== f.departureDate && <sup className="ml-0.5 text-[10px] text-muted-foreground">+1</sup>

export function FlightRow({ leg, f, airports, compact, actionLabel, onAction }: Props) {
  const { t } = useTranslation()
  // Stripe in the colour of the home-side airport, so outbound and inbound rows match.
  const home = airports.find((a) => a.home && (a.code === leg.from || a.code === leg.to))?.code ?? leg.from
  const stripe = { borderLeftColor: airportColor(home, airports) }

  if (compact)
    return (
      <div
        className="grid grid-cols-[9rem_6rem_7.5rem_6.5rem_3.5rem_minmax(3rem,1fr)_3.5rem_auto] items-center gap-x-3 rounded-md border-l-4 bg-white px-3 py-1 text-sm transition-colors hover:bg-accent"
        style={stripe}
      >
        <span className="flex min-w-0 items-center gap-1.5">
          <AirlineBadge name={f.airlines[0] ?? "?"} className="size-5 rounded text-[8px]" />
          <span className="truncate">{f.airlines.join(" + ")}</span>
        </span>
        <span className="font-medium">{fmtDate(f.departureDate)}</span>
        <Route leg={leg} airports={airports} size="sm" />
        <a href={leg.url} target="_blank" rel="noreferrer" title={t("flights.openGoogle")} className="font-semibold tabular-nums hover:underline">
          {f.departureTime}–{f.arrivalTime}
          {plusDay(f)}
        </a>
        <span className="text-xs text-muted-foreground">{fmtDuration(f.durationMinutes)}</span>
        <span className="truncate text-xs text-muted-foreground">{fmtStops(f)}</span>
        <span className="text-right font-bold text-success tabular-nums">{fmtEuro(f.price)}</span>
        <Button size="icon-xs" variant="outline" onClick={onAction} title={actionLabel} aria-label={actionLabel}>
          <Plus />
        </Button>
      </div>
    )

  return (
    <div
      className="grid grid-cols-2 items-center gap-x-4 gap-y-1 rounded-xl border border-l-4 bg-white px-4 py-3 transition-shadow hover:shadow-md xl:grid-cols-[minmax(8rem,1.2fr)_6.5rem_8rem_8.5rem_4.5rem_minmax(4rem,1fr)_4.5rem_auto]"
      style={stripe}
    >
      <Airline names={f.airlines} />
      <span className="font-semibold">{fmtDate(f.departureDate)}</span>
      <Route leg={leg} airports={airports} size="md" />
      <a href={leg.url} target="_blank" rel="noreferrer" title={t("flights.openGoogle")} className="text-lg font-bold tabular-nums hover:underline">
        {f.departureTime} – {f.arrivalTime}
        {plusDay(f)}
      </a>
      <span className="text-sm text-muted-foreground">{fmtDuration(f.durationMinutes)}</span>
      <span className="truncate text-sm text-muted-foreground">{fmtStops(f)}</span>
      <span className="text-right text-xl font-bold text-success tabular-nums">{fmtEuro(f.price)}</span>
      <Button size="sm" variant="outline" className="border-primary/40 text-primary hover:bg-primary hover:text-primary-foreground" onClick={onAction}>
        <Plus /> {actionLabel}
      </Button>
    </div>
  )
}
