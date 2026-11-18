import { Bookmark, CalendarRange, Car, Plane, Settings } from "lucide-react"
import { useEffect, useState } from "react"
import { useTranslation } from "react-i18next"

import { FindFlights } from "@/components/FindFlights"
import { TripPlan } from "@/components/TripPlan"
import { AirportsPage } from "@/pages/AirportsPage"
import { SavedPlansPage } from "@/pages/SavedPlansPage"
import { SettingsPage } from "@/pages/SettingsPage"
import { placeName, routesFor } from "@/lib/places"
import { newPlan, planKey, savePlan, travelerCount, uid } from "@/lib/plans"
import { defaultSearch, useSettings } from "@/lib/settings"
import { searchUrl, validateSearch } from "@/lib/trips"
import type { FlightOption, LegResult, Plan, PlanLeg, SearchQuery } from "@/lib/types"
import { useLocalState } from "@/lib/useLocalState"
import { useSearch } from "@/lib/useSearch"
import { cn } from "@/lib/utils"

const PAGES = [
  { hash: "#/", icon: CalendarRange, key: "nav.planner" },
  { hash: "#/plans", icon: Bookmark, key: "nav.saved" },
  { hash: "#/airports", icon: Car, key: "nav.airports" },
  { hash: "#/settings", icon: Settings, key: "nav.settings" },
] as const

function useHash() {
  const [hash, setHash] = useState(() => location.hash || "#/")
  useEffect(() => {
    const f = () => setHash(location.hash || "#/")
    window.addEventListener("hashchange", f)
    return () => window.removeEventListener("hashchange", f)
  }, [])
  return hash
}
const go = (hash: string) => {
  location.hash = hash
}

export default function App() {
  const { t } = useTranslation()
  const hash = useHash()
  const [settings, setSettings] = useSettings()
  const [query, setQuery] = useLocalState<SearchQuery>("airboy.search", defaultSearch())
  const [plan, setPlan] = useLocalState<Plan>("airboy.plan", newPlan())
  // Content of the plan as last saved or opened; null = never saved.
  const [savedKey, setSavedKey] = useLocalState<string | null>("airboy.plan.saved", null)
  const [compact, setCompact] = useLocalState("airboy.compact", false)
  const [fresh, setFresh] = useLocalState("airboy.fresh", false)
  const [targetLegId, setTargetLegId] = useState<string | null>(null)
  const { state, start, stop } = useSearch()

  const dirty = plan.legs.length > 0 && planKey(plan) !== savedKey
  const target = plan.legs.findIndex((l) => l.id === targetLegId)
  const targetLeg = target >= 0 ? plan.legs[target] : null

  function runSearch(q: SearchQuery) {
    if (validateSearch(q.from, q.to, q.dateFrom, q.dateTo, settings)) return
    start(searchUrl(routesFor(q.from, q.to, settings), q.dateFrom, q.dateTo, fresh))
  }

  function findForLeg(leg: PlanLeg) {
    const q = { from: leg.from, to: leg.to, dateFrom: leg.dateFrom, dateTo: leg.dateTo }
    setTargetLegId(leg.id)
    setQuery(q)
    runSearch(q)
    go("#/")
    window.scrollTo({ top: 0, behavior: "smooth" })
  }

  function addFlight(leg: LegResult, flight: FlightOption) {
    const chosen = { from: leg.from, to: leg.to, url: leg.url, flight, pinned: true }
    if (targetLeg) {
      setPlan({ ...plan, legs: plan.legs.map((l) => (l.id === targetLeg.id ? { ...l, chosen } : l)) })
      setTargetLegId(null)
      return
    }
    const newLeg: PlanLeg = {
      id: uid(),
      from: query.from,
      to: query.to,
      dateFrom: query.dateFrom,
      dateTo: query.dateTo,
      travelers: plan.travelers.map((x) => x.id),
      chosen,
    }
    setPlan({ ...plan, legs: [...plan.legs, newLeg] })
  }

  function openPlan(p: Plan) {
    if (dirty && p.id !== plan.id && !window.confirm(t("plan.confirmDiscard"))) return
    setPlan(p)
    setSavedKey(planKey(p))
    setTargetLegId(null)
    go("#/")
  }

  function startNew() {
    if (dirty && !window.confirm(t("plan.confirmDiscard"))) return
    setPlan(newPlan())
    setSavedKey(null)
    setTargetLegId(null)
  }

  async function save() {
    const saved = await savePlan(plan)
    setPlan(saved)
    setSavedKey(planKey(saved))
  }

  return (
    <div className="relative min-h-svh overflow-hidden bg-[linear-gradient(180deg,#e6defa_0%,#efe9fb_30%,#f6f3fb_60%,#f7f5fa_100%)]">
      <Backdrop />
      <main className="relative mx-auto max-w-[110rem] space-y-6 px-4 py-6 sm:px-6">
        <header className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-center gap-4">
            <Plane className="size-12 -rotate-12 fill-primary text-primary" />
            <div>
              <h1 className="text-4xl font-bold tracking-tight text-[oklch(0.2_0.06_280)]">AirBoy</h1>
              <p className="text-lg text-[oklch(0.3_0.08_280)]">{t("app.tagline")}</p>
            </div>
          </div>
          <nav className="flex flex-wrap gap-1 rounded-xl bg-white/70 p-1 shadow-sm backdrop-blur">
            {PAGES.map(({ hash: h, icon: Icon, key }) => (
              <a
                key={h}
                href={h}
                className={cn(
                  "inline-flex h-11 items-center gap-2 rounded-lg px-4 font-medium transition-colors",
                  hash === h ? "bg-primary text-primary-foreground shadow" : "text-foreground hover:bg-white",
                )}
              >
                <Icon className="size-5" />
                {t(key)}
              </a>
            ))}
          </nav>
        </header>

        {hash === "#/plans" ? (
          <SavedPlansPage settings={settings} currentId={plan.id} onOpen={openPlan} />
        ) : hash === "#/airports" ? (
          <AirportsPage settings={settings} onSettings={setSettings} />
        ) : hash === "#/settings" ? (
          <SettingsPage compact={compact} onCompact={setCompact} fresh={fresh} onFresh={setFresh} />
        ) : (
          <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_36rem]">
            <FindFlights
              settings={settings}
              onSettings={setSettings}
              query={query}
              onQuery={setQuery}
              search={state}
              onSearch={() => runSearch(query)}
              onStop={stop}
              compact={compact}
              onCompact={setCompact}
              target={
                targetLeg
                  ? {
                      index: target,
                      label: `${placeName(targetLeg.from, settings)} → ${placeName(targetLeg.to, settings)} (${t("plan.passengers", { count: travelerCount(targetLeg) })})`,
                    }
                  : null
              }
              onCancelTarget={() => setTargetLegId(null)}
              onAdd={addFlight}
            />
            <div className="xl:sticky xl:top-6">
              <TripPlan
                plan={plan}
                onPlan={setPlan}
                settings={settings}
                query={query}
                dirty={dirty}
                onSave={save}
                onNew={startNew}
                onOpen={() => go("#/plans")}
                targetLegId={targetLegId}
                onFindForLeg={findForLeg}
                fresh={fresh}
              />
            </div>
          </div>
        )}
      </main>
    </div>
  )
}

/** Soft dawn glow with layered mountain silhouettes behind the header. */
function Backdrop() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-[7rem]">
      <div className="absolute -top-24 right-0 h-80 w-[60%] rounded-full bg-[radial-gradient(closest-side,#f6d3e4,transparent)] opacity-80" />
      <svg className="absolute right-0 bottom-0 h-28 w-full max-w-5xl" viewBox="0 0 1000 220" preserveAspectRatio="none">
        <defs>
          <linearGradient id="m1" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#b9abe6" />
            <stop offset="1" stopColor="#e9e2f8" stopOpacity="0" />
          </linearGradient>
          <linearGradient id="m2" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#8f7fd0" />
            <stop offset="1" stopColor="#d9d0f3" stopOpacity="0" />
          </linearGradient>
        </defs>
        <path d="M0 220 L120 150 L210 170 L330 95 L420 140 L520 60 L600 105 L700 40 L790 110 L880 80 L1000 130 L1000 220 Z" fill="url(#m1)" />
        <path d="M680 58 L700 40 L722 60 L708 56 L700 64 L692 55 Z" fill="#ffffff" opacity="0.8" />
        <path d="M200 220 L330 160 L430 185 L560 120 L660 165 L760 125 L880 170 L1000 150 L1000 220 Z" fill="url(#m2)" opacity="0.7" />
      </svg>
    </div>
  )
}
