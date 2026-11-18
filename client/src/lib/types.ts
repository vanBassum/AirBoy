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

/** All options for one route on one day, as streamed by the server. */
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
  /** Part of the home group: the airports you can drive to. */
  home: boolean
  /** Euro per started day parked. */
  parkingPerDay: number
  /** Fixed extra cost (fuel/toll/train) per parked trip. */
  travelCost: number
}

/** Client-side filters; changing them never triggers a new search. */
export type Filters = {
  excludedAirlines: string[]
  /** Airports hidden from the results (the search itself still includes them). */
  excludedAirports: string[]
  /** Departure hour window [depFrom, depTo], 0–24. */
  depFrom: number
  depTo: number
  /** Max price per person per flight; null = no limit. */
  maxPrice: number | null
  directOnly: boolean
}

export type AppSettings = {
  airports: Airport[]
  /** Display name of the home group, e.g. "Home" or "Netherlands". */
  homeName: string
  filters: Filters
}

/** "HOME" = every home airport; otherwise a 3-letter IATA code. */
export type Place = string

export type SearchQuery = {
  from: Place
  to: Place
  dateFrom: string
  dateTo: string
}

export type LegFlight = { leg: LegResult; flight: FlightOption }

export type ChosenFlight = {
  from: string
  to: string
  url: string
  flight: FlightOption
  /** Picked by hand: the optimizer keeps it. Otherwise the optimizer may replace it. */
  pinned: boolean
}

export type PlanLeg = {
  id: string
  from: Place
  to: Place
  dateFrom: string
  dateTo: string
  /** People on this flight; prices are per person. */
  passengers: number
  chosen: ChosenFlight | null
}

export type Plan = {
  id: string
  name: string
  legs: PlanLeg[]
  /** All flights touching the home group use the same airport (the car stays there). */
  sameHomeAirport: boolean
  updatedAt?: string
}
