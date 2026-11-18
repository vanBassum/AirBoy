import { ChevronDown } from "lucide-react"
import { useTranslation } from "react-i18next"

import { AirlineBadge } from "@/components/AirlineBadge"
import { AirportTag } from "@/components/AirportTag"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Slider } from "@/components/ui/slider"
import { defaultFilters } from "@/lib/settings"
import { fmtEuro, fmtHour } from "@/lib/format"
import type { Airport, Filters } from "@/lib/types"

type Props = {
  filters: Filters
  onChange: (f: Filters) => void
  airports: Airport[]
  /** Airlines and airport codes present in the current results. */
  airlines: string[]
  codes: string[]
  priceCeiling: number
}

const arr = (v: number | readonly number[]) => (Array.isArray(v) ? v : [v]) as number[]
const toggle = (list: string[], item: string, on: boolean) => (on ? list.filter((x) => x !== item) : [...list, item])

/** Compact, single-row filters. They apply to the results and to the optimizer. */
export function FilterBar({ filters: f, onChange, airports, airlines, codes, priceCeiling }: Props) {
  const { t } = useTranslation()
  const set = (patch: Partial<Filters>) => onChange({ ...f, ...patch })
  const ceiling = Math.max(priceCeiling, 50)
  const price = f.maxPrice === null ? ceiling : Math.min(f.maxPrice, ceiling)
  const shownAirlines = airlines.filter((a) => !f.excludedAirlines.includes(a)).length
  const shownCodes = codes.filter((c) => !f.excludedAirports.includes(c)).length
  const changed = JSON.stringify(f) !== JSON.stringify(defaultFilters)

  return (
    <div className="flex flex-wrap items-center gap-x-5 gap-y-3 text-sm">
      <Label className="font-normal">
        <Checkbox checked={f.directOnly} onCheckedChange={(v) => set({ directOnly: v === true })} /> {t("filters.directOnly")}
      </Label>

      <ListFilter label={t("filters.airlines")} summary={airlines.length ? `${shownAirlines}/${airlines.length}` : "–"} disabled={!airlines.length}>
        {airlines.map((a) => (
          <Label key={a} className="font-normal">
            <Checkbox checked={!f.excludedAirlines.includes(a)} onCheckedChange={(v) => set({ excludedAirlines: toggle(f.excludedAirlines, a, v === true) })} />
            <AirlineBadge name={a} className="size-5 rounded text-[8px]" />
            {a}
          </Label>
        ))}
      </ListFilter>

      <ListFilter label={t("filters.airports")} summary={codes.length ? `${shownCodes}/${codes.length}` : "–"} disabled={!codes.length}>
        {codes.map((c) => (
          <Label key={c} className="font-normal">
            <Checkbox checked={!f.excludedAirports.includes(c)} onCheckedChange={(v) => set({ excludedAirports: toggle(f.excludedAirports, c, v === true) })} />
            <AirportTag code={c} airports={airports} />
            <span className="truncate text-muted-foreground">{airports.find((a) => a.code === c)?.name}</span>
          </Label>
        ))}
      </ListFilter>

      <div className="flex items-center gap-3">
        <span className="whitespace-nowrap">
          {t("filters.departureTime")}: <span className="tabular-nums">{fmtHour(f.depFrom)}–{fmtHour(f.depTo)}</span>
        </span>
        <div className="w-32">
          <Slider min={0} max={24} step={1} value={[f.depFrom, f.depTo]} onValueChange={(v) => { const [a, b] = arr(v); set({ depFrom: a, depTo: b }) }} />
        </div>
      </div>

      <div className="flex items-center gap-3">
        <span className="whitespace-nowrap">
          {t("filters.maxPrice")}: <span className="tabular-nums">{f.maxPrice === null ? t("filters.noLimit") : fmtEuro(price)}</span>
        </span>
        <div className="w-28">
        <Slider
          min={10}
          max={ceiling}
          step={5}
          value={[price]}
          onValueChange={(v) => {
            const p = arr(v)[0]
            set({ maxPrice: p >= ceiling ? null : p })
          }}
        />
        </div>
      </div>

      {changed && (
        <button className="text-primary hover:underline" onClick={() => onChange(defaultFilters)}>
          {t("filters.clear")}
        </button>
      )}
    </div>
  )
}

function ListFilter({ label, summary, disabled, children }: { label: string; summary: string; disabled: boolean; children: React.ReactNode }) {
  return (
    <Popover>
      <PopoverTrigger
        disabled={disabled}
        className="inline-flex h-8 items-center gap-1.5 rounded-lg border bg-white px-2.5 hover:bg-accent disabled:opacity-50"
      >
        {label}: <span className="font-semibold tabular-nums">{summary}</span>
        <ChevronDown className="size-3.5 text-muted-foreground" />
      </PopoverTrigger>
      <PopoverContent className="w-64 p-3" align="start">
        <div className="max-h-64 space-y-2.5 overflow-y-auto">{children}</div>
      </PopoverContent>
    </Popover>
  )
}
