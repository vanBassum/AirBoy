import { addDays } from "date-fns"

import { iso } from "./format"
import type { AppSettings, Filters, SearchQuery } from "./types"
import { useLocalState } from "./useLocalState"

export const defaultFilters: Filters = {
  excludedAirlines: [],
  excludedAirports: [],
  depFrom: 0,
  depTo: 24,
  maxPrice: null,
  directOnly: true,
}

export const defaultSettings: AppSettings = {
  homeName: "Home",
  airports: [
    { code: "CRL", name: "Charleroi", home: true, parkingPerDay: 0, travelCost: 0 },
    { code: "EIN", name: "Eindhoven", home: true, parkingPerDay: 0, travelCost: 0 },
    { code: "BRU", name: "Brussels", home: true, parkingPerDay: 0, travelCost: 0 },
    { code: "AMS", name: "Schiphol", home: true, parkingPerDay: 0, travelCost: 0 },
    { code: "TIA", name: "Tirana", home: false, parkingPerDay: 0, travelCost: 0 },
  ],
  filters: defaultFilters,
}

// Default window is relative to today, so it never starts in the past.
const inDays = (n: number) => iso(addDays(new Date(), n))

export const defaultSearch = (): SearchQuery => ({ from: "HOME", to: "TIA", dateFrom: inDays(30), dateTo: inDays(37) })

export function useSettings() {
  const [settings, setSettings] = useLocalState<AppSettings>("airboy.settings.v3", defaultSettings)
  // Older saves may miss newer filter fields.
  return [{ ...defaultSettings, ...settings, filters: { ...defaultFilters, ...settings.filters } }, setSettings] as const
}
