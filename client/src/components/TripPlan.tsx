import { addDays, parseISO } from "date-fns"
import {
  CalendarDays,
  CalendarRange,
  ChevronDown,
  ChevronUp,
  FilePlus,
  FolderOpen,
  Lock,
  LockOpen,
  Pencil,
  Plane,
  Plus,
  Save,
  Search,
  Trash2,
  Coins,
  Minus,
  Users,
  WandSparkles,
  X,
} from "lucide-react"
import { useRef, useState } from "react"
import { useTranslation } from "react-i18next"

import { AirlineBadge } from "@/components/AirlineBadge"
import { AirportTag } from "@/components/AirportTag"
import { DateRangeField } from "@/components/DateRangeField"
import { PlaceSelect } from "@/components/PlaceSelect"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { Progress } from "@/components/ui/progress"
import { fmtDate, fmtEuro, fmtRange, iso } from "@/lib/format"
import { optimizePlan } from "@/lib/optimize"
import { placeCodes, placeName, routesFor } from "@/lib/places"
import { chosenFits, pax, planTotals, uid } from "@/lib/plans"
import { streamLegs } from "@/lib/stream"
import { searchUrl, validateSearch } from "@/lib/trips"
import type { AppSettings, LegResult, Plan, PlanLeg, SearchQuery } from "@/lib/types"
import { cn } from "@/lib/utils"

const PALETTE = ["#6d28d9", "#2563eb", "#16a34a", "#ea580c", "#db2777", "#0891b2"]
const color = (i: number) => PALETTE[i % PALETTE.length]

type Props = {
  plan: Plan
  onPlan: (p: Plan) => void
  settings: AppSettings
  /** Current search, used to prefill the first flexible leg. */
  query: SearchQuery
  dirty: boolean
  onSave: () => Promise<void>
  onNew: () => void
  onOpen: () => void
  targetLegId: string | null
  onFindForLeg: (leg: PlanLeg) => void
  fresh: boolean
}

type OptState = { running: boolean; leg: number; done: number; total: number; error: string | null }

export function TripPlan(p: Props) {
  const { t } = useTranslation()
  const { plan, settings: s } = p
  const [editing, setEditing] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [opt, setOpt] = useState<OptState>({ running: false, leg: 0, done: 0, total: 0, error: null })
  const cancel = useRef<(() => void) | null>(null)
  const totals = planTotals(plan, s)

  const set = (patch: Partial<Plan>) => p.onPlan({ ...plan, ...patch })
  const setLeg = (id: string, patch: Partial<PlanLeg>) =>
    set({
      legs: plan.legs.map((l) => {
        if (l.id !== id) return l
        const next = { ...l, ...patch }
        // A route or date change can invalidate the chosen flight.
        return chosenFits(next, placeCodes(next.from, s), placeCodes(next.to, s)) ? next : { ...next, chosen: null }
      }),
    })
  const move = (i: number, d: -1 | 1) => {
    const legs = [...plan.legs]
    ;[legs[i], legs[i + d]] = [legs[i + d], legs[i]]
    set({ legs })
  }

  function addLeg() {
    const last = plan.legs.at(-1)
    const start = last ? iso(addDays(parseISO(last.dateTo), 1)) : p.query.dateFrom
    const leg: PlanLeg = {
      id: uid(),
      from: last ? last.to : p.query.from,
      to: last ? last.from : p.query.to,
      dateFrom: start,
      dateTo: last ? iso(addDays(parseISO(start), 6)) : p.query.dateTo,
      passengers: last ? pax(last) : 1,
      chosen: null,
    }
    set({ legs: [...plan.legs, leg] })
    setEditing(leg.id)
  }

  async function optimize() {
    setOpt({ running: true, leg: 0, done: 0, total: 0, error: null })
    const results: Record<string, LegResult[]> = {}
    try {
      for (const [i, leg] of plan.legs.entries()) {
        if (leg.chosen?.pinned) continue
        const problem = validateSearch(leg.from, leg.to, leg.dateFrom, leg.dateTo, s)
        if (problem) throw new Error(t("plan.legProblem", { n: i + 1, problem }))
        const collected: LegResult[] = []
        const run = streamLegs(searchUrl(routesFor(leg.from, leg.to, s), leg.dateFrom, leg.dateTo, p.fresh), {
          onStart: (total) => setOpt((o) => ({ ...o, leg: i, done: 0, total })),
          onLeg: (l) => {
            collected.push(l)
            setOpt((o) => ({ ...o, done: o.done + 1 }))
          },
        })
        cancel.current = run.cancel
        await run.done
        results[leg.id] = collected
      }
      const legs = optimizePlan(plan, results, s)
      if (!legs) setOpt((o) => ({ ...o, running: false, error: t("plan.noSolution") }))
      else {
        set({ legs })
        setOpt((o) => ({ ...o, running: false }))
      }
    } catch (e) {
      setOpt((o) => ({ ...o, running: false, error: (e as Error).message }))
    } finally {
      cancel.current = null
    }
  }

  function stopOptimize() {
    cancel.current?.()
    setOpt((o) => ({ ...o, running: false }))
  }

  async function save() {
    setSaving(true)
    try {
      await p.onSave()
    } finally {
      setSaving(false)
    }
  }

  return (
    <section className="panel">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex min-w-0 flex-1 gap-3">
          <CalendarRange className="mt-1 size-7 shrink-0 text-primary" />
          <div className="min-w-0 flex-1">
            <input
              className="w-full truncate rounded bg-transparent text-2xl font-semibold outline-none focus:bg-accent/60"
              value={plan.name}
              onChange={(e) => set({ name: e.target.value })}
              aria-label={t("plan.name")}
            />
            <p className="text-sm text-muted-foreground">
              {t("plan.subtitle")}
              {p.dirty && <span className="ml-1 text-primary">· {t("plan.unsaved")}</span>}
            </p>
          </div>
        </div>
        <div className="flex gap-1.5">
          {/* Phones: icons only, like the rest of the toolbar. */}
          <Button size="sm" variant="outline" onClick={p.onNew} title={t("plan.new")} aria-label={t("plan.new")}>
            <FilePlus /> <span className="hidden sm:inline">{t("plan.new")}</span>
          </Button>
          <Button size="sm" variant="outline" onClick={p.onOpen} title={t("plan.open")} aria-label={t("plan.open")}>
            <FolderOpen /> <span className="hidden sm:inline">{t("plan.open")}</span>
          </Button>
          <Button size="sm" variant={p.dirty ? "default" : "outline"} onClick={save} disabled={saving} title={t("plan.save")} aria-label={t("plan.save")}>
            <Save /> <span className="hidden sm:inline">{t("plan.save")}</span>
          </Button>
        </div>
      </header>

      <div className="relative mt-4 space-y-3">
        {plan.legs.length === 0 && <div className="rounded-xl border border-dashed py-10 text-center text-sm text-muted-foreground">{t("plan.empty")}</div>}
        {plan.legs.map((leg, i) => (
          <LegCard
            key={leg.id}
            index={i}
            leg={leg}
            settings={s}
            isLast={i === plan.legs.length - 1}
            targeted={p.targetLegId === leg.id}
            editing={editing === leg.id}
            onEdit={() => setEditing(editing === leg.id ? null : leg.id)}
            onChange={(patch) => setLeg(leg.id, patch)}
            onDelete={() => set({ legs: plan.legs.filter((l) => l.id !== leg.id) })}
            onMove={(d) => move(i, d)}
            onFind={() => p.onFindForLeg(leg)}
          />
        ))}
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <Button variant="outline" onClick={addLeg}>
          <Plus /> {t("plan.addLeg")}
        </Button>
        <Label className="font-normal text-muted-foreground" title={t("plan.sameHomeHint")}>
          <Checkbox checked={plan.sameHomeAirport} onCheckedChange={(v) => set({ sameHomeAirport: v === true })} /> {t("plan.sameHome")}
        </Label>
        {opt.running ? (
          <Button variant="destructive" className="ml-auto" onClick={stopOptimize}>
            <X /> {t("search.stop")}
          </Button>
        ) : (
          <Button className="ml-auto" disabled={plan.legs.length === 0} onClick={optimize}>
            <WandSparkles /> {t("plan.optimize")}
          </Button>
        )}
      </div>
      {opt.running && (
        <div className="mt-3 flex items-center gap-3 text-sm text-muted-foreground">
          <Progress value={opt.total ? (opt.done / opt.total) * 100 : 0} className="flex-1" />
          <span className="whitespace-nowrap tabular-nums">{t("plan.optimizing", { n: opt.leg + 1, done: opt.done, total: opt.total })}</span>
        </div>
      )}
      {opt.error && <p className="mt-2 text-sm text-destructive">{opt.error}</p>}

      <div className="mt-5 flex items-center gap-4 rounded-xl border bg-card px-4 py-3">
        <Coins className="size-7 text-primary" />
        <div className="flex-1">
          <div className="text-lg font-semibold">{t("plan.summary")}</div>
          <div className="text-sm text-muted-foreground">
            {t("plan.legsCount", { count: totals.legs })} · {t("plan.chosenCount", { count: totals.chosen })}
          </div>
        </div>
        <div className="text-right">
          <div className="text-sm text-muted-foreground">{t("plan.totalEst")}</div>
          <div className="text-2xl font-bold text-success tabular-nums">{fmtEuro(totals.total)}</div>
          {totals.parking > 0 && (
            <div className="text-xs text-muted-foreground">
              {t("plan.breakdown", { flights: fmtEuro(totals.flights), parking: fmtEuro(totals.parking) })}
            </div>
          )}
        </div>
      </div>
    </section>
  )
}

type LegProps = {
  index: number
  leg: PlanLeg
  settings: AppSettings
  isLast: boolean
  targeted: boolean
  editing: boolean
  onEdit: () => void
  onChange: (patch: Partial<PlanLeg>) => void
  onDelete: () => void
  onMove: (d: -1 | 1) => void
  onFind: () => void
}

function LegCard({ index, leg, settings: s, isLast, targeted, editing, onEdit, onChange, onDelete, onMove, onFind }: LegProps) {
  const { t } = useTranslation()
  const c = leg.chosen

  return (
    <div className={cn("rounded-xl border bg-card p-3 transition-shadow", targeted && "ring-2 ring-primary", editing && "shadow-md")}>
      <div className="flex gap-3">
        <div className="flex flex-col items-center">
          <span className="flex size-8 shrink-0 items-center justify-center rounded-full font-bold text-white" style={{ background: color(index) }}>
            {index + 1}
          </span>
          {!isLast && <span className="mt-1 w-0.5 flex-1 rounded" style={{ background: `${color(index)}55` }} />}
        </div>

        <div className="min-w-0 flex-1 space-y-0.5">
          <div className="flex items-center gap-2 font-semibold">
            <Plane className="size-4 shrink-0" />
            <span className="truncate">
              {placeName(leg.from, s)} → {placeName(leg.to, s)}
            </span>
          </div>
          <div className="flex items-center gap-1 text-sm text-muted-foreground">
            <Users className="size-3.5" />
            <Button size="icon-xs" variant="ghost" onClick={() => onChange({ passengers: pax(leg) - 1 })} disabled={pax(leg) <= 1} aria-label={t("plan.fewer")}>
              <Minus />
            </Button>
            <span className="min-w-20 text-center tabular-nums">{t("plan.passengers", { count: pax(leg) })}</span>
            <Button size="icon-xs" variant="ghost" onClick={() => onChange({ passengers: pax(leg) + 1 })} disabled={pax(leg) >= 9} aria-label={t("plan.more")}>
              <Plus />
            </Button>
          </div>
          <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
            <CalendarDays className="size-3.5" />
            {fmtRange(leg.dateFrom, leg.dateTo)}
            <span>({c?.pinned ? t("plan.fixed") : t("plan.flexible")})</span>
          </div>
          {c ? (
            <div className="flex flex-wrap items-center gap-1.5 pt-1 text-sm">
              <AirlineBadge name={c.flight.airlines[0] ?? "?"} className="size-5 rounded text-[8px]" />
              <a href={c.url} target="_blank" rel="noreferrer" className="font-medium hover:underline">
                {fmtDate(c.flight.departureDate)} {c.flight.departureTime}–{c.flight.arrivalTime}
              </a>
              <AirportTag code={c.from} airports={s.airports} size="sm" />
              <span className="text-muted-foreground">→</span>
              <AirportTag code={c.to} airports={s.airports} size="sm" />
              <button
                className="ml-1 inline-flex items-center gap-1 rounded px-1 text-xs text-muted-foreground hover:bg-accent hover:text-foreground"
                onClick={() => onChange({ chosen: { ...c, pinned: !c.pinned } })}
                title={c.pinned ? t("plan.unpinHint") : t("plan.pinHint")}
              >
                {c.pinned ? <Lock className="size-3" /> : <LockOpen className="size-3" />}
                {c.pinned ? t("plan.pinned") : t("plan.auto")}
              </button>
            </div>
          ) : (
            <div className="pt-1 text-sm text-muted-foreground italic">{t("plan.notChosen")}</div>
          )}
        </div>

        {c && (
          <div className="shrink-0 text-right">
            <div className="rounded-md bg-success/10 px-2 py-0.5 text-lg font-bold text-success tabular-nums">{fmtEuro(c.flight.price * pax(leg))}</div>
            <div className="max-w-24 truncate text-xs text-muted-foreground">{c.flight.airlines.join(", ")}</div>
          </div>
        )}
      </div>

      <div className="-mt-1 flex justify-end">
        <IconButton label={t("plan.findForLeg")} onClick={onFind}>
          <Search />
        </IconButton>
        <IconButton label={t("plan.edit")} onClick={onEdit} active={editing}>
          <Pencil />
        </IconButton>
        <IconButton label={t("plan.moveUp")} onClick={() => onMove(-1)} disabled={index === 0}>
          <ChevronUp />
        </IconButton>
        <IconButton label={t("plan.moveDown")} onClick={() => onMove(1)} disabled={isLast}>
          <ChevronDown />
        </IconButton>
        <IconButton label={t("plan.delete")} onClick={onDelete}>
          <Trash2 />
        </IconButton>
      </div>

      {editing && (
        <div className="mt-3 grid gap-3 border-t pt-3 sm:grid-cols-2">
          <Field label={t("search.from")}>
            <PlaceSelect label={t("search.from")} value={leg.from} onChange={(from) => onChange({ from })} settings={s} />
          </Field>
          <Field label={t("search.to")}>
            <PlaceSelect label={t("search.to")} value={leg.to} onChange={(to) => onChange({ to })} settings={s} />
          </Field>
          <Field label={t("plan.window")}>
            <DateRangeField from={leg.dateFrom} to={leg.dateTo} onChange={(dateFrom, dateTo) => onChange({ dateFrom, dateTo })} />
          </Field>
          <div className="flex justify-end sm:col-span-2">
            <Button size="sm" onClick={onEdit}>
              {t("dates.done")}
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}

function IconButton({ label, onClick, children, disabled, active }: { label: string; onClick: () => void; children: React.ReactNode; disabled?: boolean; active?: boolean }) {
  return (
    <Button size="icon-sm" variant={active ? "secondary" : "ghost"} onClick={onClick} disabled={disabled} title={label} aria-label={label}>
      {children}
    </Button>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex min-w-0 flex-col gap-1.5">
      <div className="text-sm font-medium">{label}</div>
      {children}
    </div>
  )
}
