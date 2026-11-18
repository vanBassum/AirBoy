import { ArrowRight, Plane, PlaneLanding } from "lucide-react"
import { useMemo, useState } from "react"

import { Airline, AirlineBadge } from "@/components/AirlineBadge"
import { AirportTag, airportColor } from "@/components/AirportTag"
import { DensityToggle } from "@/components/DensityToggle"
import { SortSelect } from "@/components/SortSelect"
import { buttonVariants } from "@/components/ui/button"
import {
  fmtDate,
  fmtDateLong,
  fmtDuration,
  fmtEuro,
  fmtStops,
  isDirection,
  oneWayFlights,
  sortOneWay,
  visibleAirports,
  type OneWaySort,
} from "@/lib/trips"
import type { Airport, Direction, FlightOption, LegResult, SearchSettings } from "@/lib/types"
import { cn } from "@/lib/utils"

const sorts: Record<OneWaySort, string> = { price: "Prijs (laag → hoog)", time: "Vertrektijd", duration: "Reisduur" }
const LIMIT = 200

type Props = {
  legs: LegResult[]
  settings: SearchSettings
  direction: Direction
  compact: boolean
  onCompact: (c: boolean) => void
}

export function OneWayList({ legs, settings: s, direction, compact, onCompact }: Props) {
  const [sort, setSort] = useState<OneWaySort>("price")
  const list = useMemo(() => sortOneWay(oneWayFlights(legs, s, direction), sort), [legs, s, direction, sort])

  const homes = visibleAirports(s).map((a) => a.name || a.code).join("/") || "–"
  const [from, to] = direction === "out" ? [homes, s.dest] : [s.dest, homes]
  const [d1, d2] = direction === "out" ? [s.outFrom, s.outTo] : [s.retFrom, s.retTo]
  const scanned = legs.filter((l) => isDirection(l, s, direction))
  const failed = scanned.filter((l) => l.error).length
  const Row = compact ? CompactRow : RoomyRow

  return (
    <section className="rounded-2xl border border-white/70 bg-white/90 p-5 shadow-lg shadow-primary/5 backdrop-blur">
      <header className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div className="flex gap-3">
          {direction === "out" ? <Plane className="mt-1 size-6 text-primary" /> : <PlaneLanding className="mt-1 size-6 text-primary" />}
          <div>
            <h2 className="flex flex-wrap items-center gap-2 text-xl font-semibold">
              {direction === "out" ? "Heenvluchten" : "Terugvluchten"}: {from} <ArrowRight className="size-5" /> {to}
            </h2>
            <p className="text-sm text-muted-foreground">
              {fmtDateLong(d1)} – {fmtDateLong(d2)} · {list.length} vluchten gevonden
              {failed > 0 && <span className="text-destructive"> · {failed} dagen mislukt</span>}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <DensityToggle compact={compact} onChange={onCompact} />
          <SortSelect value={sort} onChange={setSort} options={sorts} />
        </div>
      </header>

      {scanned.length === 0 ? (
        <Empty>Klik op “Zoek vluchten” om te beginnen.</Empty>
      ) : list.length === 0 ? (
        <Empty>Geen vluchten binnen de filters.</Empty>
      ) : (
        <div className={compact ? "space-y-1" : "space-y-2"}>
          {list.slice(0, LIMIT).map(({ leg, flight, airport }, i) => (
            <Row key={i} leg={leg} f={flight} airport={airport} airports={s.airports} direction={direction} />
          ))}
          {list.length > LIMIT && <p className="pt-2 text-center text-sm text-muted-foreground">+{list.length - LIMIT} meer; verfijn de filters.</p>}
        </div>
      )}
    </section>
  )
}

type RowProps = { leg: LegResult; f: FlightOption; airport: string; airports: Airport[]; direction: Direction }

function Route({ leg, airport, airports, direction, size }: Omit<RowProps, "f"> & { size: "sm" | "md" }) {
  const home = <AirportTag code={airport} airports={airports} size={size} />
  const other = <span className="text-muted-foreground">{direction === "out" ? leg.to : leg.from}</span>
  return (
    <span className="inline-flex items-center gap-1.5 text-sm">
      {direction === "out" ? home : other}
      <ArrowRight className="size-3.5 text-muted-foreground" />
      {direction === "out" ? other : home}
    </span>
  )
}

const plusDay = (f: FlightOption) => f.arrivalDate !== f.departureDate && <sup className="ml-0.5 text-[10px] text-muted-foreground">+1</sup>

function RoomyRow({ leg, f, airport, airports, direction }: RowProps) {
  return (
    <div
      className="grid grid-cols-2 items-center gap-x-4 gap-y-1 rounded-xl border border-l-4 bg-white px-4 py-3 transition-shadow hover:shadow-md md:grid-cols-[minmax(9rem,1.3fr)_1fr_7rem_8.5rem_5rem_minmax(5rem,1fr)_5rem_auto]"
      style={{ borderLeftColor: airportColor(airport, airports) }}
    >
      <Airline names={f.airlines} />
      <span className="font-semibold">{fmtDate(f.departureDate)}</span>
      <Route leg={leg} airport={airport} airports={airports} direction={direction} size="md" />
      <span className="text-lg font-bold tabular-nums">
        {f.departureTime} – {f.arrivalTime}
        {plusDay(f)}
      </span>
      <span className="text-sm text-muted-foreground">{fmtDuration(f.durationMinutes)}</span>
      <span className="truncate text-sm text-muted-foreground">{fmtStops(f)}</span>
      <span className="text-right text-xl font-bold text-success tabular-nums">{fmtEuro(f.price)}</span>
      <a href={leg.url} target="_blank" rel="noreferrer" className={buttonVariants({ size: "sm", className: "px-5" })}>
        Bekijk
      </a>
    </div>
  )
}

function CompactRow({ leg, f, airport, airports, direction }: RowProps) {
  return (
    <a
      href={leg.url}
      target="_blank"
      rel="noreferrer"
      title="Open in Google Flights"
      className={cn(
        "grid items-center gap-x-3 rounded-md border-l-4 bg-white px-3 py-1 text-sm transition-colors hover:bg-accent",
        "grid-cols-[10rem_6.5rem_6.5rem_6.5rem_3.5rem_minmax(4rem,1fr)_3.5rem]",
      )}
      style={{ borderLeftColor: airportColor(airport, airports) }}
    >
      <span className="flex min-w-0 items-center gap-1.5">
        <AirlineBadge name={f.airlines[0] ?? "?"} className="size-5 rounded text-[8px]" />
        <span className="truncate">{f.airlines.join(" + ")}</span>
      </span>
      <span className="font-medium">{fmtDate(f.departureDate)}</span>
      <Route leg={leg} airport={airport} airports={airports} direction={direction} size="sm" />
      <span className="font-semibold tabular-nums">
        {f.departureTime}–{f.arrivalTime}
        {plusDay(f)}
      </span>
      <span className="text-xs text-muted-foreground">{fmtDuration(f.durationMinutes)}</span>
      <span className="truncate text-xs text-muted-foreground">{fmtStops(f)}</span>
      <span className="text-right font-bold text-success tabular-nums">{fmtEuro(f.price)}</span>
    </a>
  )
}

export function Empty({ children }: { children: React.ReactNode }) {
  return <div className="rounded-xl border border-dashed py-12 text-center text-muted-foreground">{children}</div>
}
