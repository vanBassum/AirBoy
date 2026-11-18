import { differenceInCalendarDays, parseISO } from "date-fns"

import i18n from "@/i18n"

import { isHomeCode } from "./places"
import type { AppSettings, ChosenFlight, Plan, PlanLeg } from "./types"

export const uid = () => Math.random().toString(36).slice(2, 10)

export function newPlan(): Plan {
  return {
    id: uid(),
    name: i18n.t("plan.defaultName"),
    legs: [],
    sameHomeAirport: true,
  }
}

/** Passengers on a leg (plans saved before passenger counts had a travelers list). */
export const pax = (leg: PlanLeg) => {
  const old = (leg as PlanLeg & { travelers?: unknown[] }).travelers
  return Math.min(9, Math.max(1, leg.passengers ?? old?.length ?? 1))
}

/** Inclusive number of calendar days from a to b. */
export const spanDays = (a: string, b: string) => differenceInCalendarDays(parseISO(b), parseISO(a)) + 1

/**
 * Parking intervals: a flight leaving a home airport parks the car there until a later
 * flight lands at a home airport again. An interval that never closes is not charged.
 * Returns, per leg index, whether it opens or closes a charged interval.
 */
export function parkingIntervals(legs: { departsHome: boolean; arrivesHome: boolean }[]) {
  const opens = legs.map(() => false)
  const closes = legs.map(() => false)
  let openAt = -1
  legs.forEach((l, i) => {
    if (openAt < 0 && l.departsHome) openAt = i
    else if (openAt >= 0 && l.arrivesHome) {
      opens[openAt] = true
      closes[i] = true
      openAt = -1
    }
  })
  // parkedAfter[i]: the car is parked (in a charged interval) between leg i and leg i+1.
  const parkedAfter = legs.map(() => false)
  let parked = false
  legs.forEach((_, i) => {
    if (opens[i]) parked = true
    if (closes[i]) parked = false
    parkedAfter[i] = parked
  })
  return { opens, closes, parkedAfter }
}

/** Parking and travel costs for the chosen flights, in plan order. */
export function parkingCost(chosen: ChosenFlight[], s: AppSettings) {
  const { opens, closes } = parkingIntervals(chosen.map((c) => ({ departsHome: isHomeCode(c.from, s), arrivesHome: isHomeCode(c.to, s) })))
  let total = 0
  let start: ChosenFlight | null = null
  chosen.forEach((c, i) => {
    if (opens[i]) start = c
    if (closes[i] && start) {
      const airport = s.airports.find((a) => a.code === start!.from)
      if (airport) total += airport.parkingPerDay * spanDays(start.flight.departureDate, c.flight.arrivalDate) + airport.travelCost
      start = null
    }
  })
  return total
}

export function planTotals(plan: Plan, s: AppSettings) {
  const chosenLegs = plan.legs.filter((l) => l.chosen)
  const flights = chosenLegs.reduce((sum, l) => sum + l.chosen!.flight.price * pax(l), 0)
  const parking = parkingCost(
    chosenLegs.map((l) => l.chosen!),
    s,
  )
  return { flights, parking, total: flights + parking, chosen: chosenLegs.length, legs: plan.legs.length }
}

/** True when the chosen flight still fits the leg's route and dates. */
export function chosenFits(leg: PlanLeg, codesFrom: string[], codesTo: string[]) {
  const c = leg.chosen
  if (!c) return true
  return codesFrom.includes(c.from) && codesTo.includes(c.to) && c.flight.departureDate >= leg.dateFrom && c.flight.departureDate <= leg.dateTo
}

// ---- server storage ----

export async function listPlans(): Promise<Plan[]> {
  const r = await fetch("/api/plans")
  if (!r.ok) throw new Error(`HTTP ${r.status}`)
  return r.json()
}

export async function savePlan(plan: Plan): Promise<Plan> {
  const r = await fetch(`/api/plans/${encodeURIComponent(plan.id)}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(plan),
  })
  if (!r.ok) throw new Error(`HTTP ${r.status}`)
  return r.json()
}

export async function deletePlan(id: string) {
  const r = await fetch(`/api/plans/${encodeURIComponent(id)}`, { method: "DELETE" })
  if (!r.ok && r.status !== 404) throw new Error(`HTTP ${r.status}`)
}

/** Stable comparison of a plan's content (ignores server stamps). */
export const planKey = (p: Plan) => JSON.stringify({ ...p, updatedAt: undefined })
