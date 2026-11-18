import { ArrowLeftRight, ArrowRight, Plane, Search, Square, X } from "lucide-react"
import { useMemo, useState } from "react"
import { useTranslation } from "react-i18next"

import { DateRangeField } from "@/components/DateRangeField"
import { DensityToggle } from "@/components/DensityToggle"
import { FilterBar } from "@/components/FilterBar"
import { FlightRow } from "@/components/FlightRow"
import { PlaceSelect } from "@/components/PlaceSelect"
import { SortSelect } from "@/components/SortSelect"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { fmtDateLong } from "@/lib/format"
import { placeName } from "@/lib/places"
import { airlinesIn, filteredFlights, maxPriceIn, sortFlights, validateSearch, type FlightSort } from "@/lib/trips"
import type { AppSettings, FlightOption, LegResult, SearchQuery } from "@/lib/types"
import type { SearchState } from "@/lib/useSearch"

const LIMIT = 200

type Props = {
  settings: AppSettings
  onSettings: (s: AppSettings) => void
  query: SearchQuery
  onQuery: (q: SearchQuery) => void
  search: SearchState
  onSearch: () => void
  onStop: () => void
  compact: boolean
  onCompact: (c: boolean) => void
  /** Set while choosing a flight for an existing leg of the plan. */
  target: { index: number; label: string } | null
  onCancelTarget: () => void
  onAdd: (leg: LegResult, flight: FlightOption) => void
}

export function FindFlights(p: Props) {
  const { t } = useTranslation()
  const { settings: s, query: q, search } = p
  const [sort, setSort] = useState<FlightSort>("price")
  const sorts: Record<FlightSort, string> = { price: t("sort.price"), time: t("sort.time"), duration: t("sort.duration") }
  const set = (patch: Partial<SearchQuery>) => p.onQuery({ ...q, ...patch })
  const problem = validateSearch(q.from, q.to, q.dateFrom, q.dateTo, s)

  const list = useMemo(() => sortFlights(filteredFlights(search.legs, s.filters), sort), [search.legs, s.filters, sort])
  const airlines = useMemo(() => airlinesIn(search.legs), [search.legs])
  const codes = useMemo(() => [...new Set(search.legs.flatMap((l) => [l.from, l.to]))].sort(), [search.legs])
  const ceiling = useMemo(() => maxPriceIn(search.legs), [search.legs])
  const failed = search.legs.filter((l) => l.error).length
  const pct = search.total ? Math.round((search.done / search.total) * 100) : 0
  const actionLabel = p.target ? t("flights.useForLeg", { n: p.target.index + 1 }) : t("flights.addToPlan")

  return (
    <div className="space-y-6">
      <section className="panel">
        <header className="mb-4 flex items-start gap-3">
          <Search className="mt-1 size-7 text-primary" />
          <div>
            <h2 className="text-2xl font-semibold">{t("find.title")}</h2>
            <p className="text-sm text-muted-foreground">{t("find.subtitle")}</p>
          </div>
        </header>

        {p.target && (
          <div className="mb-4 flex items-center justify-between gap-3 rounded-lg bg-primary/10 px-3 py-2 text-sm text-primary">
            <span>{t("find.choosingFor", { n: p.target.index + 1, route: p.target.label })}</span>
            <Button size="xs" variant="ghost" onClick={p.onCancelTarget}>
              <X /> {t("common.cancel")}
            </Button>
          </div>
        )}

        <div className="grid items-end gap-3 md:grid-cols-[1fr_auto_1fr] 2xl:grid-cols-[1fr_auto_1fr_1.2fr_auto]">
          <Field label={t("search.from")}>
            <PlaceSelect label={t("search.from")} value={q.from} onChange={(from) => set({ from })} settings={s} />
          </Field>
          <Button variant="secondary" className="hidden h-12 w-12 rounded-xl md:inline-flex" onClick={() => set({ from: q.to, to: q.from })} aria-label={t("search.swap")}>
            <ArrowLeftRight className="size-5" />
          </Button>
          <Field label={t("search.to")}>
            <PlaceSelect label={t("search.to")} value={q.to} onChange={(to) => set({ to })} settings={s} />
          </Field>
          <Field label={t("search.dates")}>
            <DateRangeField from={q.dateFrom} to={q.dateTo} onChange={(dateFrom, dateTo) => set({ dateFrom, dateTo })} />
          </Field>
          {search.running ? (
            <Button variant="destructive" className="h-12 rounded-xl px-6 text-base" onClick={p.onStop}>
              <Square /> {t("search.stop")}
            </Button>
          ) : (
            <Button className="h-12 rounded-xl px-6 text-base" disabled={!!problem} onClick={p.onSearch}>
              <Search className="size-5" /> {t("search.submit")}
            </Button>
          )}
        </div>
        {(problem || search.error) && <p className="mt-2 text-sm text-destructive">{problem ?? search.error}</p>}

        <div className="mt-4 border-t pt-4">
          <FilterBar
            filters={s.filters}
            onChange={(filters) => p.onSettings({ ...s, filters })}
            airports={s.airports}
            airlines={airlines}
            codes={codes}
            priceCeiling={ceiling}
          />
        </div>
      </section>

      <section className="panel">
        <header className="mb-4 flex flex-wrap items-start justify-between gap-3">
          <div className="flex gap-3">
            <Plane className="mt-1 size-6 text-primary" />
            <div>
              <h2 className="flex flex-wrap items-center gap-2 text-xl font-semibold">
                {t("flights.title")}: {placeName(q.from, s)} <ArrowRight className="size-5" /> {placeName(q.to, s)}
              </h2>
              <p className="text-sm text-muted-foreground">
                {fmtDateLong(q.dateFrom)} – {fmtDateLong(q.dateTo)} · {t("flights.found", { count: list.length })}
                {failed > 0 && <span className="text-destructive"> · {t("flights.failedDays", { count: failed })}</span>}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <DensityToggle compact={p.compact} onChange={p.onCompact} />
            <SortSelect value={sort} onChange={setSort} options={sorts} />
          </div>
        </header>

        {search.total > 0 && search.running && (
          <div className="mb-4 flex items-center gap-3 text-sm text-muted-foreground">
            <Progress value={pct} className="flex-1" />
            <span className="whitespace-nowrap tabular-nums">{t("search.progress", { done: search.done, total: search.total, cached: search.cached })}</span>
          </div>
        )}

        {search.legs.length === 0 && !search.running ? (
          <Empty>{t("flights.start")}</Empty>
        ) : list.length === 0 && !search.running ? (
          <Empty>{t("flights.empty")}</Empty>
        ) : (
          <div className={p.compact ? "space-y-1" : "space-y-2"}>
            {list.slice(0, LIMIT).map(({ leg, flight }, i) => (
              <FlightRow
                key={i}
                leg={leg}
                f={flight}
                airports={s.airports}
                compact={p.compact}
                actionLabel={actionLabel}
                onAction={() => p.onAdd(leg, flight)}
              />
            ))}
            {list.length > LIMIT && <p className="pt-2 text-center text-sm text-muted-foreground">{t("flights.more", { count: list.length - LIMIT })}</p>}
          </div>
        )}
      </section>
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    // flex column: popover focus-guard spans next to the trigger must not add a line box
    <div className="flex min-w-0 flex-col gap-1.5">
      <div className="text-sm font-medium">{label}</div>
      {children}
    </div>
  )
}

export function Empty({ children }: { children: React.ReactNode }) {
  return <div className="rounded-xl border border-dashed py-12 text-center text-muted-foreground">{children}</div>
}
