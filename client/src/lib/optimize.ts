import { homeAirports, touchesHome } from "./places"
import { parkingIntervals, spanDays, travelerCount } from "./plans"
import { passes } from "./trips"
import type { AppSettings, ChosenFlight, LegResult, Plan, PlanLeg } from "./types"

/** Minimum time between landing and the next departure. */
const MIN_CONNECTION_MINUTES = 60

const minutes = (date: string, time: string) => Date.parse(`${date}T${time}`) / 60_000
const depMinutes = (c: ChosenFlight) => minutes(c.flight.departureDate, c.flight.departureTime)
const arrMinutes = (c: ChosenFlight) => minutes(c.flight.arrivalDate, c.flight.arrivalTime)

function candidates(leg: PlanLeg, results: LegResult[], s: AppSettings, home: string | null): ChosenFlight[] {
  let list: ChosenFlight[]
  if (leg.chosen?.pinned) list = [leg.chosen]
  else
    list = results
      .filter((r) => !s.filters.excludedAirports.includes(r.from) && !s.filters.excludedAirports.includes(r.to))
      .flatMap((r) =>
        r.flights
          .filter((f) => passes(f, s.filters) && f.departureDate >= leg.dateFrom && f.departureDate <= leg.dateTo)
          .map((flight) => ({ from: r.from, to: r.to, url: r.url, flight, pinned: false })),
      )
  if (home) list = list.filter((c) => (!touchesHome(leg.from, s) || c.from === home) && (!touchesHome(leg.to, s) || c.to === home))
  return list
}

/**
 * Cheapest set of flights, one per leg, in plan order (each departs after the previous
 * lands). Pinned legs are kept. With `sameHomeAirport`, every home-side airport must be the
 * same, and parking at that airport counts: it decomposes into per-step terms, so a
 * dynamic programme over consecutive legs finds the exact optimum.
 */
function solve(plan: Plan, results: Record<string, LegResult[]>, s: AppSettings, home: string | null) {
  const legs = plan.legs
  const cands = legs.map((l) => candidates(l, results[l.id] ?? [], s, home))
  if (cands.some((c) => c.length === 0)) return null

  const airport = home ? s.airports.find((a) => a.code === home) : undefined
  const rate = airport?.parkingPerDay ?? 0
  const travel = airport?.travelCost ?? 0
  const { closes, parkedAfter } = parkingIntervals(legs.map((l) => ({ departsHome: touchesHome(l.from, s), arrivesHome: touchesHome(l.to, s) })))
  const chargeParking = home !== null

  const nodeCost = (i: number, c: ChosenFlight) =>
    c.flight.price * travelerCount(legs[i]) +
    (chargeParking && closes[i] ? rate * spanDays(c.flight.departureDate, c.flight.arrivalDate) + travel : 0)

  let cost = cands[0].map((c) => nodeCost(0, c))
  const back: Int32Array[] = [new Int32Array(cands[0].length).fill(-1)]

  for (let i = 1; i < legs.length; i++) {
    const prev = cands[i - 1]
    const cur = cands[i]
    const next = new Array<number>(cur.length).fill(Infinity)
    const from = new Int32Array(cur.length).fill(-1)
    const parked = chargeParking && parkedAfter[i - 1]
    for (let j = 0; j < cur.length; j++) {
      const dep = depMinutes(cur[j])
      const own = nodeCost(i, cur[j])
      for (let k = 0; k < prev.length; k++) {
        if (!Number.isFinite(cost[k]) || arrMinutes(prev[k]) + MIN_CONNECTION_MINUTES > dep) continue
        const gap = parked ? rate * (spanDays(prev[k].flight.departureDate, cur[j].flight.departureDate) - 1) : 0
        const total = cost[k] + gap + own
        if (total < next[j]) {
          next[j] = total
          from[j] = k
        }
      }
    }
    cost = next
    back.push(from)
  }

  let bestJ = -1
  cost.forEach((c, j) => {
    if (Number.isFinite(c) && (bestJ < 0 || c < cost[bestJ])) bestJ = j
  })
  if (bestJ < 0) return null

  const picks: ChosenFlight[] = []
  for (let i = legs.length - 1, j = bestJ; i >= 0; i--) {
    picks.unshift(cands[i][j])
    j = back[i][j]
  }
  return { cost: cost[bestJ], picks }
}

/** Returns the legs with their optimal flights, or null when nothing fits. */
export function optimizePlan(plan: Plan, results: Record<string, LegResult[]>, s: AppSettings): PlanLeg[] | null {
  if (plan.legs.length === 0) return null
  const usesHome = plan.legs.some((l) => touchesHome(l.from, s) || touchesHome(l.to, s))
  const homes: (string | null)[] = plan.sameHomeAirport && usesHome ? homeAirports(s).map((a) => a.code) : [null]
  let best: ReturnType<typeof solve> = null
  for (const h of homes) {
    const r = solve(plan, results, s, h)
    if (r && (!best || r.cost < best.cost)) best = r
  }
  if (!best) return null
  return plan.legs.map((l, i) => ({ ...l, chosen: l.chosen?.pinned ? l.chosen : best.picks[i] }))
}
