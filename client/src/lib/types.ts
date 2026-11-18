export type FlightOption = {
  price: number
  airlines: string[]
  stops: number
  via: string[]
  departureDate: string
  departureTime: string
  arrivalDate: string
  arrivalTime: string
  durationMinutes: number
}

export type LegResult = {
  from: string
  to: string
  date: string
  url: string
  cached: boolean
  error: string | null
  flights: FlightOption[]
}

export type Airport = {
  code: string
  name: string
  enabled: boolean
  /** Euro per started day parked. */
  parkingPerDay: number
  /** Fixed extra cost (fuel/toll/train), round trip. */
  travelCost: number
}

/** Client-side filters; changing them never triggers a new scan. */
export type Filters = {
  excludedAirlines: string[]
  /** Home airports hidden from the results (the search itself still includes them). */
  excludedAirports: string[]
  /** Departure hour window [depFrom, depTo], 0–24. */
  depFrom: number
  depTo: number
  /** Max price per one-way flight; null = no limit. */
  maxPrice: number | null
  directOnly: boolean
  minNights: number
  maxNights: number
}

export type SearchSettings = {
  dest: string
  outFrom: string
  outTo: string
  retFrom: string
  retTo: string
  adults: number
  airports: Airport[]
  filters: Filters
}

export type Direction = "out" | "ret"

export type LegFlight = { leg: LegResult; flight: FlightOption; airport: string }

export type Trip = {
  airport: Airport
  out: FlightOption
  outLeg: LegResult
  ret: FlightOption
  retLeg: LegResult
  nights: number
  flightPrice: number
  extraCost: number
  total: number
}
