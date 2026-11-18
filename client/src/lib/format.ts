import { format, parseISO } from "date-fns"

import i18n, { locale } from "@/i18n"

import type { FlightOption } from "./types"

export const iso = (d: Date) => format(d, "yyyy-MM-dd")
export const fmtDate = (d: string) => format(parseISO(d), "EEE d MMM", { locale: locale.dateFns })
export const fmtDateLong = (d: string) => format(parseISO(d), "d MMM yyyy", { locale: locale.dateFns })

/** "22 – 27 Dec 2026", or "30 Dec 2026 – 3 Jan 2027" across years. */
export function fmtRange(from: string, to: string) {
  const a = parseISO(from)
  const b = parseISO(to)
  if (a.getFullYear() !== b.getFullYear()) return `${fmtDateLong(from)} – ${fmtDateLong(to)}`
  if (a.getMonth() !== b.getMonth()) return `${format(a, "d MMM", { locale: locale.dateFns })} – ${fmtDateLong(to)}`
  return `${format(a, "d", { locale: locale.dateFns })} – ${fmtDateLong(to)}`
}

export const fmtEuro = (n: number) =>
  new Intl.NumberFormat(locale.intl, { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(n)
export const fmtDuration = (min: number) => i18n.t("flight.duration", { h: Math.floor(min / 60), m: String(min % 60).padStart(2, "0") })
export const fmtHour = (h: number) => `${String(h).padStart(2, "0")}:00`
export const fmtStops = (f: FlightOption) =>
  f.stops === 0 ? i18n.t("flight.direct") : i18n.t("flight.stops", { count: f.stops, via: f.via.join(", ") })
