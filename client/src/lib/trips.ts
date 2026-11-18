import { differenceInCalendarDays, format, parseISO } from "date-fns"

import i18n, { locale } from "@/i18n"

import type { Direction, Filters, FlightOption, LegFlight, LegResult, SearchSettings, Trip } from "./types"

export const iso = (d: Date) => format(d, "yyyy-MM-dd")
export const fmtDate = (d: string) => format(parseISO(d), "EEE d MMM", { locale: locale.dateFns })
export const fmtDateLong = (d: string) => format(parseISO(d), "d MMM yyyy", { locale: locale.dateFns })
export const fmtEuro = (n: number) =>
  new Intl.NumberFormat(locale.intl, { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(n)
export const fmtDuration = (min: number) => i18n.t("flight.duration", { h: Math.floor(min / 60), m: String(min % 60).padStart(2, "0") })
export const fmtHour = (h: number) => `${String(h).padStart(2, "0")}:00`
export const fmtStops = (f: FlightOption) =>
  f.stops === 0 ? i18n.t("flight.direct") : i18n.t("flight.stops", { count: f.stops, via: f.via.join(", ") })

/** Always scan with max 1 stop: Google then returns direct flights too, and the stops filter stays client-side. */
const SCAN_MAX_STOPS = 1

export function searchUrl(s: SearchSettings, fresh: boolean) {
  const p = new URLSearchParams({
    origins: enabledAirports(s).map((a) => a.code).join(","),
    dest: s.dest,
    outFrom: s.outFrom,
    outTo: s.outTo,
    retFrom: s.retFrom,
    retTo: s.retTo,
    maxStops: String(SCAN_MAX_STOPS),
    adults: String(s.adults),
    fresh: String(fresh),
  })
  return `/api/search?${p}`
}

/** Airports included in the search query. */
export const enabledAirports = (s: SearchSettings) => s.airports.filter((a) => a.enabled)

/** Airports shown in the results: searched and not hidden by the filter. */
export const visibleAirports = (s: SearchSettings) => enabledAirports(s).filter((a) => !s.filters.excludedAirports.includes(a.code))

/** Mirrors the server-side checks so the user sees why a search can't start. */
export function validate(s: SearchSettings): string | null {
  const homes = enabledAirports(s)
  if (!/^[A-Z]{3}$/.test(s.dest)) return i18n.t("validate.dest")
  if (homes.length === 0) return i18n.t("validate.noAirport")
  if (homes.some((a) => !/^[A-Z]{3}$/.test(a.code))) return i18n.t("validate.codes")
  if (s.outTo < s.outFrom || s.retTo < s.retFrom) return i18n.t("validate.period")
  const days = (a: string, b: string) => differenceInCalendarDays(parseISO(b), parseISO(a)) + 1
  const total = homes.length * (days(s.outFrom, s.outTo) + days(s.retFrom, s.retTo))
  if (total > 600) return i18n.t("validate.tooMany", { count: total })
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

export function cheapest(leg: LegResult | undefined, x: Filters): FlightOption | undefined {
  if (!leg) return undefined
  return leg.flights.filter((f) => passes(f, x)).reduce<FlightOption | undefined>((b, f) => (!b || f.price < b.price ? f : b), undefined)
}

export const isDirection = (l: LegResult, s: SearchSettings, dir: Direction) =>
  dir === "out" ? l.to === s.dest && l.from !== s.dest : l.from === s.dest && l.to !== s.dest

const homeOf = (l: LegResult, dir: Direction) => (dir === "out" ? l.from : l.to)

/** All flights in one direction that pass the filters, for enabled airports only. */
export function oneWayFlights(legs: LegResult[], s: SearchSettings, dir: Direction): LegFlight[] {
  const homes = new Set(visibleAirports(s).map((a) => a.code))
  return legs
    .filter((l) => isDirection(l, s, dir) && homes.has(homeOf(l, dir)))
    .flatMap((leg) => leg.flights.filter((f) => passes(f, s.filters)).map((flight) => ({ leg, flight, airport: homeOf(leg, dir) })))
}

export type OneWaySort = "price" | "time" | "duration"
export function sortOneWay(list: LegFlight[], by: OneWaySort) {
  const key = (x: LegFlight) =>
    by === "price" ? x.flight.price : by === "duration" ? x.flight.durationMinutes : Date.parse(`${x.flight.departureDate}T${x.flight.departureTime}`)
  return [...list].sort((a, b) => key(a) - key(b) || a.flight.price - b.flight.price)
}

/** Every outbound/return day pair per airport, returning to the same airport (car is parked there). */
export function buildTrips(legs: LegResult[], s: SearchSettings): Trip[] {
  const x = s.filters
  const trips: Trip[] = []
  for (const airport of visibleAirports(s)) {
    const outs = legs.filter((l) => l.from === airport.code && l.to === s.dest)
    const rets = legs.filter((l) => l.from === s.dest && l.to === airport.code)
    for (const outLeg of outs) {
      const out = cheapest(outLeg, x)
      if (!out) continue
      for (const retLeg of rets) {
        const ret = cheapest(retLeg, x)
        if (!ret) continue
        const nights = differenceInCalendarDays(parseISO(ret.departureDate), parseISO(out.arrivalDate))
        if (nights < x.minNights || nights > x.maxNights) continue
        const parkedDays = differenceInCalendarDays(parseISO(ret.arrivalDate), parseISO(out.departureDate)) + 1
        const extraCost = airport.parkingPerDay * parkedDays + airport.travelCost
        const flightPrice = out.price + ret.price
        trips.push({ airport, out, outLeg, ret, retLeg, nights, flightPrice, extraCost, total: flightPrice + extraCost })
      }
    }
  }
  return trips.sort((a, b) => a.total - b.total)
}

export function airlinesIn(legs: LegResult[]) {
  return [...new Set(legs.flatMap((l) => l.flights.flatMap((f) => f.airlines)))].sort()
}

export function maxPriceIn(legs: LegResult[]) {
  return legs.reduce((m, l) => l.flights.reduce((mm, f) => Math.max(mm, f.price), m), 0)
}

/** Background colour from green (cheap) to red (expensive). */
export function heat(value: number, min: number, max: number) {
  const t = max > min ? (value - min) / (max - min) : 0
  return `oklch(0.92 0.09 ${145 - t * 120})`
}
