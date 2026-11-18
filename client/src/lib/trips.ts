import { differenceInCalendarDays, parseISO } from "date-fns"

import i18n from "@/i18n"

import { routesFor } from "./places"
import type { AppSettings, Filters, FlightOption, LegFlight, LegResult, Place } from "./types"

/** Always search with max 1 stop: Google then returns direct flights too, and the stops filter stays client-side. */
const SCAN_MAX_STOPS = 1
const MAX_SEARCHES = 600

/** Prices are always per person (adults=1); the plan multiplies by travelers. */
export function searchUrl(routes: [string, string][], dateFrom: string, dateTo: string, fresh: boolean) {
  const p = new URLSearchParams({
    routes: routes.map(([a, b]) => `${a}-${b}`).join(","),
    start: dateFrom,
    end: dateTo,
    maxStops: String(SCAN_MAX_STOPS),
    adults: "1",
    fresh: String(fresh),
  })
  return `/api/search?${p}`
}

const days = (a: string, b: string) => differenceInCalendarDays(parseISO(b), parseISO(a)) + 1

/** Mirrors the server-side checks so the user sees why a search can't start. */
export function validateSearch(from: Place, to: Place, dateFrom: string, dateTo: string, s: AppSettings): string | null {
  const routes = routesFor(from, to, s)
  if (routes.length === 0) return i18n.t("validate.noRoute")
  if (routes.some(([a, b]) => !/^[A-Z]{3}$/.test(a) || !/^[A-Z]{3}$/.test(b))) return i18n.t("validate.codes")
  if (dateTo < dateFrom) return i18n.t("validate.period")
  const total = routes.length * days(dateFrom, dateTo)
  if (total > MAX_SEARCHES) return i18n.t("validate.tooMany", { count: total })
  return null
}

const hour = (t: string) => Number(t.slice(0, 2))

export function passes(f: FlightOption, x: Filters) {
  const h = hour(f.departureTime)
  return (
    (!x.directOnly || f.stops === 0) &&
    h >= x.depFrom &&
    h < Math.max(x.depTo, x.depFrom + 1) &&
    (x.maxPrice === null || f.price <= x.maxPrice) &&
    !f.airlines.some((a) => x.excludedAirlines.includes(a))
  )
}

/** Every flight in the legs that passes the filters. */
export function filteredFlights(legs: LegResult[], x: Filters): LegFlight[] {
  return legs
    .filter((l) => !x.excludedAirports.includes(l.from) && !x.excludedAirports.includes(l.to))
    .flatMap((leg) => leg.flights.filter((f) => passes(f, x)).map((flight) => ({ leg, flight })))
}

export type FlightSort = "price" | "time" | "duration"
export function sortFlights(list: LegFlight[], by: FlightSort) {
  const key = (x: LegFlight) =>
    by === "price" ? x.flight.price : by === "duration" ? x.flight.durationMinutes : Date.parse(`${x.flight.departureDate}T${x.flight.departureTime}`)
  return [...list].sort((a, b) => key(a) - key(b) || a.flight.price - b.flight.price)
}

export function airlinesIn(legs: LegResult[]) {
  return [...new Set(legs.flatMap((l) => l.flights.flatMap((f) => f.airlines)))].sort()
}

export function maxPriceIn(legs: LegResult[]) {
  return legs.reduce((m, l) => l.flights.reduce((mm, f) => Math.max(mm, f.price), m), 0)
}
