import { addDays, parseISO } from "date-fns"
import { ArrowLeftRight, CalendarDays, List } from "lucide-react"
import { useMemo, useState } from "react"

import { Airline, AirlineBadge } from "@/components/AirlineBadge"
import { AirportDot, AirportTag, airportColor } from "@/components/AirportTag"
import { DensityToggle } from "@/components/DensityToggle"
import { Empty } from "@/components/OneWayList"
import { SortSelect } from "@/components/SortSelect"
import { Button, buttonVariants } from "@/components/ui/button"
import { buildTrips, fmtDate, fmtEuro, heat, iso, visibleAirports } from "@/lib/trips"
import type { Airport, FlightOption, LegResult, SearchSettings, Trip } from "@/lib/types"

type Sort = "total" | "date" | "flights"
const sorts: Record<Sort, string> = { total: "Totaalprijs", flights: "Alleen vluchtprijs", date: "Vertrekdatum" }
const LIMIT = 150

type Props = {
  legs: LegResult[]
  settings: SearchSettings
  compact: boolean
  onCompact: (c: boolean) => void
}

export function ReturnList({ legs, settings: s, compact, onCompact }: Props) {
  const [sort, setSort] = useState<Sort>("total")
  const [view, setView] = useState<"list" | "calendar">("list")
  const trips = useMemo(() => buildTrips(legs, s), [legs, s])
  const sorted = useMemo(
    () =>
      sort === "total"
        ? trips
        : [...trips].sort((a, b) =>
            sort === "flights" ? a.flightPrice - b.flightPrice : a.out.departureDate.localeCompare(b.out.departureDate) || a.total - b.total,
          ),
    [trips, sort],
  )
  const homes = visibleAirports(s).map((a) => a.name || a.code).join("/") || "–"
  const Row = compact ? CompactTripRow : TripRow

  return (
    <section className="rounded-2xl border border-white/70 bg-white/90 p-5 shadow-lg shadow-primary/5 backdrop-blur">
      <header className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div className="flex gap-3">
          <ArrowLeftRight className="mt-1 size-6 text-primary" />
          <div>
            <h2 className="text-xl font-semibold">
              Retourcombinaties: {homes} ⇄ {s.dest}
            </h2>
            <p className="text-sm text-muted-foreground">
              {s.filters.minNights}–{s.filters.maxNights} nachten · terug naar dezelfde luchthaven · {trips.length} combinaties
              {trips[0] && <> · beste {fmtEuro(trips[0].total)}</>}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex rounded-lg border bg-white p-0.5">
            <Button size="sm" variant={view === "list" ? "secondary" : "ghost"} onClick={() => setView("list")}>
              <List /> Lijst
            </Button>
            <Button size="sm" variant={view === "calendar" ? "secondary" : "ghost"} onClick={() => setView("calendar")}>
              <CalendarDays /> Kalender
            </Button>
          </div>
          {view === "list" && <DensityToggle compact={compact} onChange={onCompact} />}
          {view === "list" && <SortSelect value={sort} onChange={setSort} options={sorts} />}
        </div>
      </header>

      {legs.length === 0 ? (
        <Empty>Klik op “Zoek vluchten” om te beginnen.</Empty>
      ) : trips.length === 0 ? (
        <Empty>Geen combinaties binnen de nachten en filters.</Empty>
      ) : view === "calendar" ? (
        <CalendarMatrix trips={trips} settings={s} />
      ) : (
        <div className={compact ? "space-y-1" : "space-y-2"}>
          {sorted.slice(0, LIMIT).map((t, i) => (
            <Row key={i} t={t} airports={s.airports} />
          ))}
          {sorted.length > LIMIT && <p className="pt-2 text-center text-sm text-muted-foreground">+{sorted.length - LIMIT} meer; verfijn de filters.</p>}
        </div>
      )}
    </section>
  )
}

type RowProps = { t: Trip; airports: Airport[] }

function TripRow({ t, airports }: RowProps) {
  return (
    <div
      className="grid items-center gap-x-5 gap-y-2 rounded-xl border border-l-4 bg-white px-4 py-3 transition-shadow hover:shadow-md lg:grid-cols-[4rem_1fr_1fr_5rem_8rem_auto]"
      style={{ borderLeftColor: airportColor(t.airport.code, airports) }}
    >
      <AirportTag code={t.airport.code} airports={airports} size="lg" />
      <LegBrief label="Heen" f={t.out} />
      <LegBrief label="Terug" f={t.ret} />
      <span className="text-sm text-muted-foreground">{t.nights} nachten</span>
      <div className="text-right">
        <div className="text-xl font-bold text-success tabular-nums">{fmtEuro(t.total)}</div>
        <div className="text-xs text-muted-foreground">
          {fmtEuro(t.flightPrice)} vlucht{t.extraCost > 0 && ` + ${fmtEuro(t.extraCost)} parkeren/reis`}
        </div>
      </div>
      <div className="flex gap-1.5">
        <a href={t.outLeg.url} target="_blank" rel="noreferrer" className={buttonVariants({ size: "sm" })}>
          Heen
        </a>
        <a href={t.retLeg.url} target="_blank" rel="noreferrer" className={buttonVariants({ size: "sm" })}>
          Terug
        </a>
      </div>
    </div>
  )
}

function CompactTripRow({ t, airports }: RowProps) {
  return (
    <div
      className="grid grid-cols-[3.25rem_1fr_1fr_4.5rem_4rem_6rem_auto] items-center gap-x-3 rounded-md border-l-4 bg-white px-3 py-1 text-sm transition-colors hover:bg-accent"
      style={{ borderLeftColor: airportColor(t.airport.code, airports) }}
    >
      <AirportTag code={t.airport.code} airports={airports} size="sm" className="justify-self-start" />
      <LegInline f={t.out} />
      <LegInline f={t.ret} />
      <span className="text-xs text-muted-foreground">{t.nights} n</span>
      <span className="text-right font-bold text-success tabular-nums">{fmtEuro(t.total)}</span>
      <span className="truncate text-right text-xs text-muted-foreground tabular-nums">
        {fmtEuro(t.flightPrice)}
        {t.extraCost > 0 && ` + ${fmtEuro(t.extraCost)}`}
      </span>
      <span className="flex gap-1">
        <a href={t.outLeg.url} target="_blank" rel="noreferrer" className={buttonVariants({ size: "xs", variant: "secondary" })}>
          Heen
        </a>
        <a href={t.retLeg.url} target="_blank" rel="noreferrer" className={buttonVariants({ size: "xs", variant: "secondary" })}>
          Terug
        </a>
      </span>
    </div>
  )
}

function LegInline({ f }: { f: FlightOption }) {
  return (
    <span className="flex min-w-0 items-center gap-1.5">
      <AirlineBadge name={f.airlines[0] ?? "?"} className="size-5 rounded text-[8px]" />
      <span className="font-medium whitespace-nowrap">{fmtDate(f.departureDate)}</span>
      <span className="tabular-nums whitespace-nowrap">
        {f.departureTime}–{f.arrivalTime}
      </span>
      <span className="text-xs text-muted-foreground tabular-nums">{fmtEuro(f.price)}</span>
    </span>
  )
}

function LegBrief({ label, f }: { label: string; f: FlightOption }) {
  return (
    <div className="min-w-0 space-y-1">
      <div className="flex items-baseline gap-2">
        <span className="w-12 text-xs text-muted-foreground uppercase">{label}</span>
        <span className="font-semibold">{fmtDate(f.departureDate)}</span>
        <span className="font-bold tabular-nums">
          {f.departureTime}–{f.arrivalTime}
        </span>
      </div>
      <div className="flex items-center gap-2 pl-14 text-sm text-muted-foreground">
        <Airline names={f.airlines} />
        <span className="tabular-nums">{fmtEuro(f.price)}</span>
      </div>
    </div>
  )
}

function dateRange(from: string, to: string) {
  const out: string[] = []
  for (let d = parseISO(from); iso(d) <= to; d = addDays(d, 1)) out.push(iso(d))
  return out
}

/** Outbound date × nights → cheapest total (optionally for one airport). */
function CalendarMatrix({ trips, settings: s }: { trips: Trip[]; settings: SearchSettings }) {
  const [pick, setPick] = useState<string | null>(null)
  const visible = visibleAirports(s)
  const only = visible.some((a) => a.code === pick) ? pick : null
  const filtered = only ? trips.filter((t) => t.airport.code === only) : trips

  const cells = new Map<string, Trip>()
  for (const t of filtered) {
    const k = `${t.out.departureDate}|${t.nights}`
    const cur = cells.get(k)
    if (!cur || t.total < cur.total) cells.set(k, t)
  }
  const values = [...cells.values()].map((t) => t.total)
  const min = Math.min(...values)
  const max = Math.max(...values)
  const nights = Array.from({ length: s.filters.maxNights - s.filters.minNights + 1 }, (_, i) => s.filters.minNights + i)

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-1">
        <Button size="sm" variant={only === null ? "default" : "outline"} onClick={() => setPick(null)}>
          Alle luchthavens
        </Button>
        {visible.map((a) => (
          <Button key={a.code} size="sm" variant={only === a.code ? "default" : "outline"} onClick={() => setPick(a.code)}>
            <AirportDot code={a.code} airports={s.airports} /> {a.code}
          </Button>
        ))}
      </div>
      <div className="overflow-x-auto">
        <table className="w-full border-separate border-spacing-1 text-sm">
          <thead>
            <tr>
              <th className="text-left font-medium text-muted-foreground">Heen \ nachten</th>
              {nights.map((n) => (
                <th key={n} className="font-medium text-muted-foreground">
                  {n}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {dateRange(s.outFrom, s.outTo).map((d) => (
              <tr key={d}>
                <td className="pr-2 font-medium whitespace-nowrap">{fmtDate(d)}</td>
                {nights.map((n) => {
                  const t = cells.get(`${d}|${n}`)
                  return (
                    <td
                      key={n}
                      className="h-12 min-w-16 rounded-lg text-center"
                      style={t ? { background: heat(t.total, min, max) } : undefined}
                      title={
                        t
                          ? `${t.airport.code}: heen ${t.out.departureTime} ${t.out.airlines.join(", ")}, terug ${fmtDate(t.ret.departureDate)} ${t.ret.departureTime} ${t.ret.airlines.join(", ")}`
                          : undefined
                      }
                    >
                      {t ? (
                        <div className="leading-tight">
                          <div className="font-semibold">{fmtEuro(t.total)}</div>
                          {!only && (
                            <div className="text-[10px] font-bold" style={{ color: airportColor(t.airport.code, s.airports) }}>
                              {t.airport.code}
                            </div>
                          )}
                        </div>
                      ) : (
                        <span className="text-muted-foreground/40">–</span>
                      )}
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
