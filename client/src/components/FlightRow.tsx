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

  const action = (
    <Button size="sm" variant="outline" className="border-primary/40 text-primary hover:bg-primary hover:text-primary-foreground" onClick={onAction}>
      <Plus /> {actionLabel}
    </Button>
  )
  const times = (
    <a href={leg.url} target="_blank" rel="noreferrer" title={t("flights.openGoogle")} className="font-semibold tabular-nums hover:underline">
      {f.departureTime}–{f.arrivalTime}
      {plusDay(f)}
    </a>
  )

  // Phones: one stacked card for both densities.
  const mobile = (
    <div className="space-y-1.5 rounded-xl border border-l-4 bg-card px-3 py-2.5 md:hidden" style={stripe}>
      <div className="flex items-center gap-2">
        <AirlineBadge name={f.airlines[0] ?? "?"} className="size-6 rounded text-[9px]" />
        <span className="min-w-0 flex-1 truncate font-medium">{f.airlines.join(" + ")}</span>
        <span className="text-lg font-bold text-success tabular-nums">{fmtEuro(f.price)}</span>
      </div>
      <div className="flex flex-wrap items-center gap-x-2 text-sm">
        <span className="font-medium">{fmtDate(f.departureDate)}</span>
        {times}
        <span className="text-muted-foreground">
          · {fmtDuration(f.durationMinutes)} · {fmtStops(f)}
        </span>
      </div>
      <div className="flex items-center justify-between gap-2">
        <Route leg={leg} airports={airports} size="sm" />
        {action}
      </div>
    </div>
  )

  if (compact)
    return (
      <>
        {mobile}
        <div
          className="hidden grid-cols-[9rem_6rem_7.5rem_6.5rem_3.5rem_minmax(3rem,1fr)_3.5rem_auto] items-center gap-x-3 rounded-md border-l-4 bg-card px-3 py-1 text-sm transition-colors hover:bg-accent md:grid"
          style={stripe}
        >
          <span className="flex min-w-0 items-center gap-1.5">
            <AirlineBadge name={f.airlines[0] ?? "?"} className="size-5 rounded text-[8px]" />
            <span className="truncate">{f.airlines.join(" + ")}</span>
          </span>
          <span className="font-medium">{fmtDate(f.departureDate)}</span>
          <Route leg={leg} airports={airports} size="sm" />
          {times}
          <span className="text-xs text-muted-foreground">{fmtDuration(f.durationMinutes)}</span>
          <span className="truncate text-xs text-muted-foreground">{fmtStops(f)}</span>
          <span className="text-right font-bold text-success tabular-nums">{fmtEuro(f.price)}</span>
          <Button size="icon-xs" variant="outline" onClick={onAction} title={actionLabel} aria-label={actionLabel}>
            <Plus />
          </Button>
        </div>
      </>
    )

  return (
    <>
      {mobile}
      <div
        className="hidden grid-cols-2 items-center gap-x-3 gap-y-1 rounded-xl border border-l-4 bg-card px-4 py-3 transition-shadow hover:shadow-md md:grid xl:grid-cols-[minmax(8rem,1.2fr)_6.5rem_8rem_8.5rem_4.5rem_minmax(0,1fr)_4.5rem_auto]"
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
        {action}
      </div>
    </>
  )
}
