import { addDays } from "date-fns"
import { useEffect, useState } from "react"

import { iso } from "./trips"

import type { Filters, SearchSettings } from "./types"

const KEY = "airboy.settings.v2"

export const defaultFilters: Filters = {
  excludedAirlines: [],
  excludedAirports: [],
  depFrom: 0,
  depTo: 24,
  maxPrice: null,
  directOnly: true,
  minNights: 4,
  maxNights: 9,
}

// Default windows are relative to today, so they never start in the past.
const inDays = (n: number) => iso(addDays(new Date(), n))

export const defaultSettings: SearchSettings = {
  dest: "TIA",
  outFrom: inDays(30),
  outTo: inDays(44),
  retFrom: inDays(35),
  retTo: inDays(53),
  adults: 1,
  airports: [
    { code: "CRL", name: "Charleroi", enabled: true, parkingPerDay: 0, travelCost: 0 },
    { code: "EIN", name: "Eindhoven", enabled: true, parkingPerDay: 0, travelCost: 0 },
    { code: "BRU", name: "Brussel", enabled: true, parkingPerDay: 0, travelCost: 0 },
    { code: "AMS", name: "Schiphol", enabled: true, parkingPerDay: 0, travelCost: 0 },
  ],
  filters: defaultFilters,
}

function load(): SearchSettings {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return defaultSettings
    const saved = JSON.parse(raw) as Partial<SearchSettings>
    return { ...defaultSettings, ...saved, filters: { ...defaultFilters, ...saved.filters } }
  } catch {
    return defaultSettings
  }
}

export function useSettings() {
  const [settings, setSettings] = useState<SearchSettings>(load)
  useEffect(() => {
    try {
      localStorage.setItem(KEY, JSON.stringify(settings))
    } catch {
      /* storage unavailable: settings just won't persist */
    }
  }, [settings])
  return [settings, setSettings] as const
}
