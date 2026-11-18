import { ArrowLeftRight, MapPin, Plane, PlaneLanding, Search, Square, Trash2 } from "lucide-react"
import { useTranslation } from "react-i18next"
import { useState } from "react"

import { AirportPicker } from "@/components/AirportPicker"
import { DateRangeField } from "@/components/DateRangeField"
import { PassengerPicker } from "@/components/PassengerPicker"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { Progress } from "@/components/ui/progress"
import { validate } from "@/lib/trips"
import type { Direction, SearchSettings } from "@/lib/types"
import type { SearchState } from "@/lib/useSearch"
import { cn } from "@/lib/utils"

type Props = {
  settings: SearchSettings
  onChange: (s: SearchSettings) => void
  direction: Direction
  onDirection: (d: Direction) => void
  search: SearchState
  onSearch: (fresh: boolean) => void
  onStop: () => void
}

export function SearchBar({ settings: s, onChange, direction, onDirection, search, onSearch, onStop }: Props) {
  const { t } = useTranslation()
  const [fresh, setFresh] = useState(false)
  const [cacheMsg, setCacheMsg] = useState<string | null>(null)
  const set = (patch: Partial<SearchSettings>) => onChange({ ...s, ...patch })
  const range = direction === "out" ? { from: s.outFrom, to: s.outTo } : { from: s.retFrom, to: s.retTo }
  const setRange = (from: string, to: string) =>
    set(direction === "out" ? { outFrom: from, outTo: to } : { retFrom: from, retTo: to })
  const problem = validate(s)
  const pct = search.total ? Math.round((search.done / search.total) * 100) : 0

  const homes = <AirportPicker airports={s.airports} onChange={(airports) => set({ airports })} />
  const dest = (
    <label className="field-box w-full">
      <MapPin className="size-5 text-muted-foreground" />
      <input
        className="w-full bg-transparent uppercase outline-none"
        maxLength={3}
        value={s.dest}
        onChange={(e) => set({ dest: e.target.value.toUpperCase() })}
        aria-label={t("search.destination")}
      />
    </label>
  )

  async function clearCache() {
    const r = await fetch("/api/cache", { method: "DELETE" }).then((r) => r.json()).catch(() => null)
    setCacheMsg(r ? t("search.cacheCleared", { count: r.removed }) : t("search.cacheClearFailed"))
  }

  return (
    <div>
      <div className="flex gap-3">
        <DirectionTab active={direction === "out"} onClick={() => onDirection("out")} icon={<Plane className="size-5" />}>
          {t("direction.out")}
        </DirectionTab>
        <DirectionTab active={direction === "ret"} onClick={() => onDirection("ret")} icon={<PlaneLanding className="size-5" />}>
          {t("direction.ret")}
        </DirectionTab>
      </div>

      <div className="relative z-10 -mt-px rounded-2xl rounded-tl-none border border-white/70 bg-white/90 p-5 shadow-lg shadow-primary/5 backdrop-blur">
        <div className="grid items-end gap-3 md:grid-cols-[1.3fr_auto_1fr] xl:grid-cols-[1.4fr_auto_1fr_1.3fr_0.6fr_auto]">
          <Field label={t("search.from")}>{direction === "out" ? homes : dest}</Field>
          <Button
            variant="secondary"
            className="hidden h-12 w-12 rounded-xl md:inline-flex"
            onClick={() => onDirection(direction === "out" ? "ret" : "out")}
            aria-label={t("search.swap")}
          >
            <ArrowLeftRight className="size-5" />
          </Button>
          <Field label={t("search.to")}>{direction === "out" ? dest : homes}</Field>
          <Field label={direction === "out" ? t("search.departBetweenOut") : t("search.departBetweenRet")}>
            <DateRangeField key={direction} from={range.from} to={range.to} onChange={setRange} />
          </Field>
          <Field label={t("search.passengers")}>
            <PassengerPicker value={s.adults} onChange={(adults) => set({ adults })} />
          </Field>
          {search.running ? (
            <Button variant="destructive" className="h-12 rounded-xl px-6 text-base" onClick={onStop}>
              <Square /> {t("search.stop")}
            </Button>
          ) : (
            <Button className="h-12 rounded-xl px-6 text-base" disabled={!!problem} onClick={() => onSearch(fresh)}>
              <Search className="size-5" /> {t("search.submit")}
            </Button>
          )}
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm">
          <Label className="font-normal text-muted-foreground">
            <Checkbox checked={fresh} onCheckedChange={(v) => setFresh(v === true)} /> {t("search.ignoreCache")}
          </Label>
          <button className="inline-flex items-center gap-1 text-muted-foreground hover:text-foreground" onClick={clearCache}>
            <Trash2 className="size-3.5" /> {t("search.clearCache")}
          </button>
          {cacheMsg && <span className="text-muted-foreground">{cacheMsg}</span>}
          {(problem || search.error) && <span className="text-destructive">{problem ?? search.error}</span>}
          {search.total > 0 && (
            <div className="ml-auto flex min-w-64 items-center gap-3">
              <Progress value={pct} className="flex-1" />
              <span className="whitespace-nowrap text-muted-foreground tabular-nums">
                {t("search.progress", { done: search.done, total: search.total, cached: search.cached })}
                {search.failed > 0 && ` · ${t("search.failed", { count: search.failed })}`}
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function DirectionTab({ active, onClick, icon, children }: { active: boolean; onClick: () => void; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "inline-flex h-12 min-w-40 items-center justify-center gap-2 rounded-t-xl px-6 font-semibold transition-colors",
        active ? "bg-primary text-primary-foreground shadow-md" : "border border-b-0 border-white/70 bg-white/80 text-foreground hover:bg-white",
      )}
    >
      {icon}
      {children}
    </button>
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
