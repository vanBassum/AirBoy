import type { Airport, AppSettings, Place } from "./types"

/** The home group: every airport marked as home. */
export const HOME = "HOME"

export const homeAirports = (s: AppSettings): Airport[] => s.airports.filter((a) => a.home && /^[A-Z]{3}$/.test(a.code))
export const isHomeCode = (code: string, s: AppSettings) => homeAirports(s).some((a) => a.code === code)
export const touchesHome = (p: Place, s: AppSettings) => p === HOME || isHomeCode(p, s)

export const placeCodes = (p: Place, s: AppSettings): string[] => (p === HOME ? homeAirports(s).map((a) => a.code) : [p])

/** Short name: "Home", "Tirana" or the bare code. */
export const placeName = (p: Place, s: AppSettings) => (p === HOME ? s.homeName : s.airports.find((a) => a.code === p)?.name || p)

/** Name with codes: "Home (CRL/EIN)", "Tirana (TIA)". */
export const placeLabel = (p: Place, s: AppSettings) => {
  const codes = placeCodes(p, s)
  return `${placeName(p, s)} (${codes.join("/") || "–"})`
}

/** Every from→to airport pair of two places. */
export function routesFor(from: Place, to: Place, s: AppSettings): [string, string][] {
  const out: [string, string][] = []
  for (const a of placeCodes(from, s)) for (const b of placeCodes(to, s)) if (a !== b) out.push([a, b])
  return out
}
